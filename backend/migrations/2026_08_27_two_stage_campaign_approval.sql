-- =============================================================================
-- CHANGIA — Migration: two-stage campaign approval.
-- Date: 27 Aug 2026
--
-- A CAMPAIGN_MANAGER's campaign used to need only ONE REVIEWER/ORG_ADMIN/
-- SUPER_ADMIN approval (PENDING -> ACTIVE). This adds a second, independent
-- approval so no single reviewer can unilaterally activate a campaign:
--
--   DRAFT -> PENDING (manager submits)
--         -> REVIEWED (first approval — POST /campaigns/:id/approve)
--         -> ACTIVE   (second approval, by someone OTHER than the first
--                       approver — same endpoint, called again)
--
-- ORG_ADMIN/SUPER_ADMIN creating their own campaign is unaffected — it still
-- self-approves straight to ACTIVE.
--
-- Also seeds a second demo REVIEWER (reviewer2@msuya-foundation.org.tz) so
-- the two-person rule is actually testable in the demo org, which previously
-- had only one reviewer.
--
-- Applied automatically on server startup via Backend/migrate.js — this
-- script is here for anyone who prefers a manual `mysql <` apply:
--   mysql -u root -p changia < migrations/2026_08_27_two_stage_campaign_approval.sql
-- =============================================================================

USE changia;

-- 1. New intermediate status ---------------------------------------------------
ALTER TABLE campaigns
  MODIFY COLUMN status
    ENUM('DRAFT','PENDING','REVIEWED','ACTIVE','PAUSED','COMPLETED','CANCELLED')
    NOT NULL DEFAULT 'DRAFT';

-- 2. First-stage approver columns ----------------------------------------------
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS first_approved_by BIGINT UNSIGNED NULL AFTER featured_at,
  ADD COLUMN IF NOT EXISTS first_approved_at DATETIME NULL AFTER first_approved_by;

ALTER TABLE campaigns
  ADD CONSTRAINT fk_campaigns_first_approved_by
    FOREIGN KEY (first_approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Demo reviewers (org 1 = Msuya Foundation), skipped individually if already there.
-- Two are needed so the two-person rule is actually testable — a live DB may
-- have zero or one already, depending on when it was seeded.
INSERT INTO users (organization_id, first_name, last_name, email, phone, password_hash, role, status)
SELECT 1, 'Zainab', 'Kileo', 'reviewer@msuya-foundation.org.tz', '255713000003',
       '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'REVIEWER', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'reviewer@msuya-foundation.org.tz');

INSERT INTO users (organization_id, first_name, last_name, email, phone, password_hash, role, status)
SELECT 1, 'Elias', 'Mrema', 'reviewer2@msuya-foundation.org.tz', '255713000004',
       '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'REVIEWER', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'reviewer2@msuya-foundation.org.tz');
