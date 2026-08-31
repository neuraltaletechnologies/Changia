-- =============================================================================
-- CHANGIA — Migration: manager-confirmed atomic payout release.
-- Date: 10 Sep 2026
--
-- The payout destination (mobile money only) is now captured with the request
-- itself, so the separate "checkout" step is gone. After a payout clears both
-- approvals it parks in APPROVED ("on hold") until the requesting
-- CAMPAIGN_MANAGER confirms the release — that confirmation atomically fires the
-- ClickPesa mobile-money transfer and moves the row straight to PAID. The old
-- SUPER_ADMIN "mark paid" step is removed.
--
--   - Any row still in the retired AWAITING_CHECKOUT state becomes APPROVED.
--   - The AWAITING_CHECKOUT enum value is left in place here (harmless); a fresh
--     database.sql import gets the trimmed 5-value enum.
--   - confirmed_by_id / confirmed_at record who released the payout and when.
--
-- Applies on top of an existing `changia` database. For a fresh install just
-- import database.sql instead. Also applied automatically on server startup via
-- Backend/migrate.js.
--
--   mysql -u root -p changia < migrations/2026_09_10_payout_manager_confirm.sql
-- =============================================================================

USE changia;

UPDATE payouts SET status = 'APPROVED' WHERE status = 'AWAITING_CHECKOUT';

ALTER TABLE payouts
  ADD COLUMN confirmed_by_id BIGINT UNSIGNED NULL AFTER disbursement_submitted_by_id,
  ADD COLUMN confirmed_at    DATETIME NULL AFTER confirmed_by_id;

ALTER TABLE payouts
  ADD CONSTRAINT fk_payouts_confirmed_by
    FOREIGN KEY (confirmed_by_id) REFERENCES users(id) ON DELETE SET NULL;
