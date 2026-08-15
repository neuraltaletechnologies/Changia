-- =============================================================================
-- CHANGIA — Migration: Donor Pools, Campaign Donor Targets, Payment Methods
-- Date: 15 Aug 2026
--
-- Applies the donor-pool feature set on top of an existing `changia` database.
-- For a fresh install just import database.sql instead (it already includes
-- everything below). This script is idempotent: every change is guarded with
-- INFORMATION_SCHEMA checks so it can be run more than once safely.
--
--   mysql -u root -p changia < migrations/2026_08_15_donor_pools.sql
-- =============================================================================

USE changia;

-- ─── 1. donors: new columns ─────────────────────────────────────────────────
SET @has_gender := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donors' AND COLUMN_NAME = 'gender'
);
SET @sql := IF(@has_gender = 0,
  'ALTER TABLE donors ADD COLUMN gender ENUM(''MALE'',''FEMALE'',''UNSPECIFIED'') NULL AFTER location',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_position := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donors' AND COLUMN_NAME = 'position'
);
SET @sql := IF(@has_position = 0,
  'ALTER TABLE donors ADD COLUMN position VARCHAR(150) NULL AFTER gender',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_anomalous := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donors' AND COLUMN_NAME = 'is_anomalous'
);
SET @sql := IF(@has_anomalous = 0,
  "ALTER TABLE donors ADD COLUMN is_anomalous TINYINT(1) NOT NULL DEFAULT 0 AFTER preferred_channel",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Allow NULL phone (anonymous / unmatched donors land in the anomalous pool).
SET @phone_nullable := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donors'
    AND COLUMN_NAME = 'phone' AND IS_NULLABLE = 'NO'
);
SET @sql := IF(@phone_nullable > 0,
  'ALTER TABLE donors MODIFY COLUMN phone VARCHAR(32) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 2. donor_pools ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donor_pools (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id BIGINT UNSIGNED NOT NULL,
  created_by_id   BIGINT UNSIGNED NULL,
  name            VARCHAR(150) NOT NULL,
  description     TEXT NULL,
  category        ENUM('FAMILY','SCHOOL','STUDENT','OFFICE') NOT NULL DEFAULT 'FAMILY',
  is_system       TINYINT(1) NOT NULL DEFAULT 0,
  status          ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pools_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_pools_creator FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pools_org_owner (organization_id, created_by_id)
) ENGINE=InnoDB;

-- ─── 3. donor_pool_members ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donor_pool_members (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pool_id         BIGINT UNSIGNED NOT NULL,
  donor_id        BIGINT UNSIGNED NOT NULL,
  expected_amount DECIMAL(14,0) NULL,
  added_by_id     BIGINT UNSIGNED NULL,
  added_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dpm_pool FOREIGN KEY (pool_id) REFERENCES donor_pools(id) ON DELETE CASCADE,
  CONSTRAINT fk_dpm_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  UNIQUE KEY uq_dpm_pool_donor (pool_id, donor_id)
) ENGINE=InnoDB;

-- ─── 4. donor_payment_methods ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donor_payment_methods (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  donor_id        BIGINT UNSIGNED NOT NULL,
  organization_id BIGINT UNSIGNED NOT NULL,
  method          ENUM('MOMO','TIGO_PESA','AIRTEL_MONEY','HALOPESA','BANK_TRANSFER','CREDIT_CARD','CASH','OTHER') NOT NULL,
  account_ref     VARCHAR(100) NULL,
  details         JSON NULL,
  is_primary      TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dpmtd_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  CONSTRAINT fk_dpmtd_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── 5. campaign_donor_targets ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_donor_targets (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     BIGINT UNSIGNED NOT NULL,
  donor_id        BIGINT UNSIGNED NOT NULL,
  pool_id         BIGINT UNSIGNED NULL,
  expected_amount DECIMAL(14,0) NULL,
  added_by_id     BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cdt_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_cdt_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  CONSTRAINT fk_cdt_pool FOREIGN KEY (pool_id) REFERENCES donor_pools(id) ON DELETE SET NULL,
  UNIQUE KEY uq_cdt_campaign_donor (campaign_id, donor_id)
) ENGINE=InnoDB;

-- ─── 6. Ensure one system "anomalous" pool per organization ─────────────────
INSERT IGNORE INTO donor_pools (organization_id, created_by_id, name, category, is_system, status)
SELECT id, NULL, 'Anomalous / Unmatched', 'FAMILY', 1, 'ACTIVE'
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM donor_pools p
  WHERE p.organization_id = organizations.id AND p.is_system = 1
);