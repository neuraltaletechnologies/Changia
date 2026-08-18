-- =============================================================================
-- CHANGIA — Migration: Per-organization default campaign service fee (%).
-- Date: 18 Aug 2026
--
-- Applies this feature on top of an existing `changia` database. For a fresh
-- install just import database.sql instead (it already includes this).
--
-- Note: this column is also added automatically on server startup via
-- Backend/migrate.js — this script exists for anyone who prefers a manual
-- `mysql <` apply instead.
--
--   mysql -u root -p changia < migrations/2026_08_18c_organization_service_fee.sql
-- =============================================================================

USE changia;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS default_service_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00 AFTER currency;
