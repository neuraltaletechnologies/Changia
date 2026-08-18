-- =============================================================================
-- CHANGIA — Migration: Campaign cover/gallery images, closure requests, and
-- campaign-scoped payout requests.
-- Date: 18 Aug 2026
--
-- Applies this feature set on top of an existing `changia` database. For a
-- fresh install just import database.sql instead (it already includes
-- everything below). This script is idempotent: every change is guarded so
-- it can be run more than once safely.
--
--   mysql -u root -p changia < migrations/2026_08_18b_campaign_images_and_payout_requests.sql
--
-- Note: the `payouts` column additions below are also applied automatically
-- on server startup via Backend/migrate.js — this script exists for anyone
-- who prefers a manual `mysql <` apply instead.
-- =============================================================================

USE changia;

-- ─── 1. campaign_images ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_images (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  image_path  VARCHAR(500) NOT NULL,
  is_cover    TINYINT(1) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ci_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  INDEX idx_ci_campaign (campaign_id, sort_order)
) ENGINE=InnoDB;

-- ─── 2. campaign_closure_requests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_closure_requests (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     BIGINT UNSIGNED NOT NULL,
  organization_id BIGINT UNSIGNED NOT NULL,
  requested_by_id BIGINT UNSIGNED NULL,
  reason          TEXT NOT NULL,
  status          ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  decided_by_id   BIGINT UNSIGNED NULL,
  decided_at      DATETIME NULL,
  decision_notes  TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccreq_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccreq_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_ccreq_campaign_status (campaign_id, status)
) ENGINE=InnoDB;

-- ─── 3. payouts: campaign_id + reason ────────────────────────────────────────
SET @has_campaign_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payouts' AND COLUMN_NAME = 'campaign_id'
);
SET @sql := IF(@has_campaign_id = 0,
  'ALTER TABLE payouts ADD COLUMN campaign_id BIGINT UNSIGNED NULL AFTER organization_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_reason := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payouts' AND COLUMN_NAME = 'reason'
);
SET @sql := IF(@has_reason = 0,
  'ALTER TABLE payouts ADD COLUMN reason TEXT NULL AFTER amount',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payouts' AND CONSTRAINT_NAME = 'fk_payouts_campaign'
);
SET @sql := IF(@has_fk = 0,
  'ALTER TABLE payouts ADD CONSTRAINT fk_payouts_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payouts' AND INDEX_NAME = 'idx_payouts_campaign_status'
);
SET @sql := IF(@has_idx = 0,
  'ALTER TABLE payouts ADD INDEX idx_payouts_campaign_status (campaign_id, status)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
