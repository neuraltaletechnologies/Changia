-- =============================================================================
-- CHANGIA — Migration: two-stage approval for campaign completion reports.
-- Date: 15 Sep 2026
--
-- WHAT THIS DOES
--   A campaign manager's completion report (mandatory proof of fund usage) now
--   clears the same two-stage chain as payouts / closure requests / campaign
--   change requests:
--
--     PENDING_REVIEW --(stage 1: a REVIEWER's first review)-->  REVIEWED
--     REVIEWED       --(stage 2: an ORG_ADMIN's final approval)--> APPROVED
--
--   Either stage can reject / request changes (-> REJECTED, manager resubmits).
--   first_reviewed_by_id / first_reviewed_at record the stage-1 sign-off so the
--   service layer can require a *different* person for stage 2.
--
-- Applied automatically on server startup via Backend/migrate.js — this script
-- is here for a manual apply:
--   mysql -u root -p changia < migrations/2026_09_15_completion_report_two_stage.sql
--
-- Re-running is safe (guards below).
-- =============================================================================
USE changia;

-- Widen the status enum (skipped by migrate.js once REVIEWED is present).
ALTER TABLE campaign_completion_reports
  MODIFY COLUMN status ENUM('PENDING_REVIEW','REVIEWED','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW';

ALTER TABLE campaign_completion_reports
  ADD COLUMN IF NOT EXISTS first_reviewed_by_id BIGINT UNSIGNED NULL AFTER submitted_by_id,
  ADD COLUMN IF NOT EXISTS first_reviewed_at    DATETIME NULL AFTER first_reviewed_by_id;

-- FK for the stage-1 reviewer (guarded — some MySQL builds lack ADD CONSTRAINT IF NOT EXISTS).
SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'campaign_completion_reports'
    AND CONSTRAINT_NAME = 'fk_ccr_first_reviewer'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE campaign_completion_reports ADD CONSTRAINT fk_ccr_first_reviewer FOREIGN KEY (first_reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
