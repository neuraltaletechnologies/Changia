-- =============================================================================
-- CHANGIA — Migration: REVIEWER role + custom campaign service-fee approval.
-- Date: 21 Aug 2026
--
-- Adds:
--   1. A new REVIEWER user role (org-scoped approver between ORG_ADMIN and
--      CAMPAIGN_MANAGER) — approves campaigns, closure requests, completion
--      reports and custom service-fee proposals.
--   2. Custom service-fee proposal/approval columns on campaigns: a manager can
--      PROPOSE a fee % that differs from the org default; it stays pending (not
--      applied) until a reviewer/admin approves it.
--
-- Applies on top of an existing `changia` database. For a fresh install just
-- import database.sql instead (it already includes this). These changes are
-- also applied automatically on server startup via Backend/migrate.js — this
-- script exists for anyone who prefers a manual `mysql <` apply.
--
--   mysql -u root -p changia < migrations/2026_08_21_reviewer_role_and_fee_approval.sql
-- =============================================================================

USE changia;

-- 1. REVIEWER role -----------------------------------------------------------
ALTER TABLE users
  MODIFY COLUMN role
    ENUM('SUPER_ADMIN','ORG_ADMIN','REVIEWER','CAMPAIGN_MANAGER')
    NOT NULL DEFAULT 'CAMPAIGN_MANAGER';

-- 2. Custom service-fee proposal/approval columns ----------------------------
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS proposed_service_fee_percent DECIMAL(5,2) NULL AFTER public_target,
  ADD COLUMN IF NOT EXISTS fee_status ENUM('NONE','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NONE' AFTER proposed_service_fee_percent,
  ADD COLUMN IF NOT EXISTS fee_reviewed_by BIGINT UNSIGNED NULL AFTER fee_status,
  ADD COLUMN IF NOT EXISTS fee_reviewed_at DATETIME NULL AFTER fee_reviewed_by,
  ADD COLUMN IF NOT EXISTS fee_review_notes TEXT NULL AFTER fee_reviewed_at;

-- Foreign key for the reviewer (guard against re-running: MySQL has no
-- "ADD CONSTRAINT IF NOT EXISTS", so ignore error 1826 if it already exists).
ALTER TABLE campaigns
  ADD CONSTRAINT fk_campaigns_fee_reviewed_by
    FOREIGN KEY (fee_reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
