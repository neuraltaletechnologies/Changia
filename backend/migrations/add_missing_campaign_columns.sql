-- Migration: Add missing columns to campaigns table
-- Run: mysql -u root -p changia < backend/migrations/add_missing_campaign_columns.sql

-- Swahili translation columns
ALTER TABLE campaigns ADD COLUMN name_sw      VARCHAR(150) NULL AFTER story;
ALTER TABLE campaigns ADD COLUMN story_sw     TEXT NULL AFTER name_sw;
ALTER TABLE campaigns ADD COLUMN category_sw  VARCHAR(100) NULL AFTER story_sw;

-- Featured campaign columns
ALTER TABLE campaigns ADD COLUMN is_featured  TINYINT(1) NOT NULL DEFAULT 0 AFTER donor_count;
ALTER TABLE campaigns ADD COLUMN featured_at  DATETIME NULL AFTER is_featured;

-- Index for featured queries
ALTER TABLE campaigns ADD INDEX idx_campaigns_featured (is_featured, featured_at);
