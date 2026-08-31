-- =============================================================================
-- CHANGIA — Migration: Payout "proof of use" images.
-- Date: 31 Aug 2026
--
-- Adds the payout_images table — optional photos (invoices, receipts, site
-- photos) a CAMPAIGN_MANAGER attaches to a payout request so the reviewer and
-- org admin can see why the money is needed. Up to 5 per request; only
-- editable while the request is still in the approval chain (REQUESTED /
-- REVIEWED).
--
-- Applies on top of an existing `changia` database. For a fresh install just
-- import database.sql instead. This table is also created automatically on
-- server startup via Backend/migrate.js.
--
--   mysql -u root -p changia < migrations/2026_08_31_payout_proof_images.sql
-- =============================================================================

USE changia;

CREATE TABLE IF NOT EXISTS payout_images (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payout_id   BIGINT UNSIGNED NOT NULL,
  image_path  VARCHAR(500) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pi_payout FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE,
  INDEX idx_pi_payout (payout_id, sort_order)
) ENGINE=InnoDB;
