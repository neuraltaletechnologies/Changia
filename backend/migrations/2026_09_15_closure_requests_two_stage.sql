-- =============================================================================
-- CHANGIA — Migration: two-stage approval for campaign closure requests.
-- Date: 15 Sep 2026
--
-- WHAT THIS DOES
--   A CAMPAIGN_MANAGER's request to close (complete) a campaign now clears the
--   same two-stage chain as payouts and campaign change requests:
--
--     PENDING  --(stage 1: a REVIEWER's first review)-->  REVIEWED
--     REVIEWED --(stage 2: an ORG_ADMIN's final approval)--> APPROVED  (campaign -> COMPLETED)
--
--   Either stage can reject / request changes (-> REJECTED). first_approved_by_id
--   / first_approved_at record the stage-1 sign-off so the service layer can
--   require a *different* person for stage 2.
--
-- Applied automatically on server startup via Backend/migrate.js — this script
-- is here for a manual apply:
--   mysql -u root -p changia < migrations/2026_09_15_closure_requests_two_stage.sql
--
-- Re-running is safe (guards below).
-- =============================================================================
USE changia;

-- Widen the status enum (skipped by migrate.js once REVIEWED is present).
ALTER TABLE campaign_closure_requests
  MODIFY COLUMN status ENUM('PENDING','REVIEWED','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE campaign_closure_requests
  ADD COLUMN IF NOT EXISTS first_approved_by_id BIGINT UNSIGNED NULL AFTER requested_by_id,
  ADD COLUMN IF NOT EXISTS first_approved_at    DATETIME NULL AFTER first_approved_by_id;

-- FK for the stage-1 approver (guarded — some MySQL builds lack ADD CONSTRAINT IF NOT EXISTS).
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'campaign_closure_requests'
    AND CONSTRAINT_NAME = 'fk_ccreq_first_approver'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE campaign_closure_requests ADD CONSTRAINT fk_ccreq_first_approver FOREIGN KEY (first_approved_by_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
