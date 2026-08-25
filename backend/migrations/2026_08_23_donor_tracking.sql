-- ─── Donor Tracking Enhancement ──────────────────────────────────────────────
-- Adds campaign_donor_target_id to payment_attempts so we can track which
-- specific donor from the pool made each payment, and auto-update their
-- payment status when the donation is confirmed.

-- 1. Add the foreign key column to payment_attempts
ALTER TABLE payment_attempts
  ADD COLUMN campaign_donor_target_id BIGINT UNSIGNED NULL AFTER donor_name,
  ADD CONSTRAINT fk_pa_cdt FOREIGN KEY (campaign_donor_target_id)
    REFERENCES campaign_donor_targets(id) ON DELETE SET NULL;

-- 2. Add an index for fast lookups by campaign_donor_target_id
ALTER TABLE payment_attempts
  ADD INDEX idx_pa_cdt (campaign_donor_target_id);

-- 3. Add a provider column to track which gateway was used
ALTER TABLE payment_attempts
  ADD COLUMN provider VARCHAR(64) NULL AFTER gateway_ref;

-- 4. Add actual_amount and payment_status to campaign_donor_targets
--    so we can track real-time payment status per targeted donor.
ALTER TABLE campaign_donor_targets
  ADD COLUMN actual_amount DECIMAL(14,0) NULL DEFAULT 0 AFTER expected_amount,
  ADD COLUMN payment_status ENUM('UNPAID','PARTIAL','PAID_FULL') NOT NULL DEFAULT 'UNPAID' AFTER actual_amount;
