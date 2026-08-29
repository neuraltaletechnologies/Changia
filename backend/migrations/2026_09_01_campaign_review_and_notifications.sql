-- =============================================================================
-- CHANGIA — Migration: strict campaign approval chain, edit re-approval,
--                      reviewer feedback, and in-app staff notifications.
-- Date: 01 Sep 2026
--
-- WHAT THIS DOES
--   1. campaigns: adds created_by_id (so an approver can't approve a campaign
--      they created), review_notes + review_state (last reject / "request
--      changes" feedback shown back to the manager), has_pending_changes flag.
--   2. campaign_change_requests: a NEW table. A material edit (name, story,
--      goal, service fee, category, dates, minimum amount, contact phone, cover
--      image) to an already-approved / live campaign is parked here and must
--      clear the same two-stage chain (REVIEWER then ORG_ADMIN) before being
--      written onto the campaign. The live campaign keeps its last-approved
--      values in the meantime.
--   3. notifications: a NEW table. Per-user in-app notification centre for
--      staff (dashboard header bell + /dashboard/notifications page).
--
-- Applied automatically on server startup via Backend/migrate.js — this script
-- is here for anyone who prefers a manual apply:
--   mysql -u root -p changia < migrations/2026_09_01_campaign_review_and_notifications.sql
--
-- Re-running is safe: IF NOT EXISTS guards + a NULL-bounded backfill. Ignore
-- error 1826 (duplicate FK name) on the ADD CONSTRAINT if re-applying by hand.
-- =============================================================================
USE changia;

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS created_by_id BIGINT UNSIGNED NULL AFTER organization_id,
  ADD COLUMN IF NOT EXISTS review_notes TEXT NULL AFTER approved_at,
  ADD COLUMN IF NOT EXISTS review_state ENUM('NONE','CHANGES_REQUESTED') NOT NULL DEFAULT 'NONE' AFTER review_notes,
  ADD COLUMN IF NOT EXISTS has_pending_changes TINYINT(1) NOT NULL DEFAULT 0 AFTER review_state;

ALTER TABLE campaigns
  ADD CONSTRAINT fk_campaigns_created_by
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- Best-effort backfill: attribute existing campaigns to their earliest assignee.
UPDATE campaigns c
  LEFT JOIN (
    SELECT campaign_id, MIN(user_id) AS user_id
    FROM campaign_assignments GROUP BY campaign_id
  ) a ON a.campaign_id = c.id
SET c.created_by_id = a.user_id
WHERE c.created_by_id IS NULL AND a.user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS campaign_change_requests (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id       BIGINT UNSIGNED NOT NULL,
  organization_id   BIGINT UNSIGNED NOT NULL,
  submitted_by_id   BIGINT UNSIGNED NULL,
  payload           JSON NOT NULL,
  staged_cover_path VARCHAR(500) NULL,
  status            ENUM('PENDING','REVIEWED','APPLIED','REJECTED','CHANGES_REQUESTED') NOT NULL DEFAULT 'PENDING',
  first_approved_by BIGINT UNSIGNED NULL,
  first_approved_at DATETIME NULL,
  approved_by       BIGINT UNSIGNED NULL,
  approved_at       DATETIME NULL,
  review_notes      TEXT NULL,
  decided_at        DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccr2_campaign  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccr2_org       FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccr2_submitter FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ccr2_first     FOREIGN KEY (first_approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ccr2_approver  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_ccr2_campaign_status (campaign_id, status),
  INDEX idx_ccr2_org_status (organization_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  organization_id BIGINT UNSIGNED NULL,
  type            VARCHAR(48) NOT NULL DEFAULT 'system',
  title           VARCHAR(200) NOT NULL,
  body            VARCHAR(600) NULL,
  link            VARCHAR(300) NULL,
  resource        VARCHAR(48) NULL,
  resource_id     VARCHAR(48) NULL,
  read_at         DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_org  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_notif_user_unread (user_id, read_at, created_at),
  INDEX idx_notif_user_created (user_id, created_at)
) ENGINE=InnoDB;
