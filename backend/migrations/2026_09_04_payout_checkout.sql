-- =============================================================================
-- CHANGIA — Migration: Payout "checkout" (disbursement destination).
-- Date: 4 Sep 2026
--
-- After a payout clears both approvals it no longer jumps straight to APPROVED.
-- It parks in the new AWAITING_CHECKOUT state until the requesting
-- CAMPAIGN_MANAGER (or an ORG_ADMIN) submits where the money should go:
--   - MOBILE_MONEY: provider + phone
--   - BANK:         bank name + account number (+ optional branch)
--   account_name applies to both.
-- Submitting the destination moves the request to APPROVED, at which point a
-- SUPER_ADMIN can mark it PAID (and the stored phone feeds the ClickPesa payout
-- when the gateway is enabled).
--
-- Applies on top of an existing `changia` database. For a fresh install just
-- import database.sql instead. Also applied automatically on server startup via
-- Backend/migrate.js.
--
--   mysql -u root -p changia < migrations/2026_09_04_payout_checkout.sql
-- =============================================================================

USE changia;

ALTER TABLE payouts
  MODIFY COLUMN status
    ENUM('REQUESTED','REVIEWED','AWAITING_CHECKOUT','APPROVED','PAID','REJECTED')
    NOT NULL DEFAULT 'REQUESTED';

ALTER TABLE payouts
  ADD COLUMN disbursement_method          ENUM('MOBILE_MONEY','BANK') NULL AFTER notes,
  ADD COLUMN disbursement_provider        VARCHAR(40)  NULL AFTER disbursement_method,
  ADD COLUMN disbursement_account_name    VARCHAR(120) NULL AFTER disbursement_provider,
  ADD COLUMN disbursement_account_number  VARCHAR(40)  NULL AFTER disbursement_account_name,
  ADD COLUMN disbursement_phone           VARCHAR(20)  NULL AFTER disbursement_account_number,
  ADD COLUMN disbursement_bank_name       VARCHAR(120) NULL AFTER disbursement_phone,
  ADD COLUMN disbursement_branch          VARCHAR(120) NULL AFTER disbursement_bank_name,
  ADD COLUMN disbursement_submitted_at    DATETIME     NULL AFTER disbursement_branch,
  ADD COLUMN disbursement_submitted_by_id BIGINT UNSIGNED NULL AFTER disbursement_submitted_at;

ALTER TABLE payouts
  ADD CONSTRAINT fk_payouts_checkout_by
    FOREIGN KEY (disbursement_submitted_by_id) REFERENCES users(id) ON DELETE SET NULL;
