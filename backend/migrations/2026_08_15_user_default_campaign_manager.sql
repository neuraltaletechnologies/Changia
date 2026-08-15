-- =============================================================================
-- CHANGIA — Migration: New accounts default to CAMPAIGN_MANAGER
-- Date: 15 Aug 2026
--
-- Registered users are now created with the CAMPAIGN_MANAGER role and an
-- administrator promotes them later. This only changes the column default that
-- is used when an INSERT omits `role`; existing rows are left untouched.
--
--   mysql -u root -p changia < migrations/2026_08_15_user_default_campaign_manager.sql
-- =============================================================================

USE changia;

SET @default := (
  SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
);
SET @sql := IF(@default IS NULL OR @default != 'CAMPAIGN_MANAGER',
  "ALTER TABLE users MODIFY COLUMN role
     ENUM('SUPER_ADMIN','ORG_ADMIN','CAMPAIGN_MANAGER') NOT NULL DEFAULT 'CAMPAIGN_MANAGER'",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;