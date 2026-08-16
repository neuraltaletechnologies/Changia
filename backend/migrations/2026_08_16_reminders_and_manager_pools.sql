-- =============================================================================
-- CHANGIA — Migration: Message templates, reminder schedules (auto-resend),
-- and per-manager anomalous pools.
-- Date: 16 Aug 2026
--
-- Applies the reminder-automation feature set on top of an existing `changia`
-- database. For a fresh install just import database.sql instead (it already
-- includes everything below). This script is idempotent: every change is
-- guarded so it can be run more than once safely.
--
--   mysql -u root -p changia < migrations/2026_08_16_reminders_and_manager_pools.sql
-- =============================================================================

USE changia;

-- ─── 1. message_templates ───────────────────────────────────────────────────
-- Reusable SMS / WhatsApp / Email reminder templates. Body supports
-- {{donorName}}, {{amountDue}}, {{campaignName}}, {{orgName}} placeholders,
-- rendered server-side when a reminder is sent.
CREATE TABLE IF NOT EXISTS message_templates (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id BIGINT UNSIGNED NOT NULL,
  created_by_id   BIGINT UNSIGNED NULL,
  name            VARCHAR(150) NOT NULL,
  channel         ENUM('SMS','WHATSAPP','EMAIL') NOT NULL,
  subject         VARCHAR(255) NULL,
  body            TEXT NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mtpl_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_mtpl_creator FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_mtpl_org_channel (organization_id, channel)
) ENGINE=InnoDB;

-- ─── 2. reminder_schedules ──────────────────────────────────────────────────
-- Automatic resend configuration. Scope is either a non-system donor pool or
-- a campaign. Nothing sends automatically — the scheduler only creates a
-- reminder_pending_batches row for the manager to review and confirm.
CREATE TABLE IF NOT EXISTS reminder_schedules (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id       BIGINT UNSIGNED NOT NULL,
  created_by_id         BIGINT UNSIGNED NULL,
  name                  VARCHAR(150) NOT NULL,
  scope                 ENUM('POOL','CAMPAIGN') NOT NULL,
  pool_id               BIGINT UNSIGNED NULL,
  campaign_id           BIGINT UNSIGNED NULL,
  interval_days         INT UNSIGNED NOT NULL DEFAULT 7,
  channels              JSON NOT NULL,
  template_id_sms       BIGINT UNSIGNED NULL,
  template_id_whatsapp  BIGINT UNSIGNED NULL,
  template_id_email     BIGINT UNSIGNED NULL,
  is_active             TINYINT(1) NOT NULL DEFAULT 1,
  next_run_at           DATETIME NOT NULL,
  last_run_at           DATETIME NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rsch_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsch_creator FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_rsch_pool FOREIGN KEY (pool_id) REFERENCES donor_pools(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsch_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsch_tpl_sms FOREIGN KEY (template_id_sms) REFERENCES message_templates(id) ON DELETE SET NULL,
  CONSTRAINT fk_rsch_tpl_wa FOREIGN KEY (template_id_whatsapp) REFERENCES message_templates(id) ON DELETE SET NULL,
  CONSTRAINT fk_rsch_tpl_email FOREIGN KEY (template_id_email) REFERENCES message_templates(id) ON DELETE SET NULL,
  INDEX idx_rsch_org_active_next (organization_id, is_active, next_run_at)
) ENGINE=InnoDB;

-- ─── 3. reminder_pending_batches ────────────────────────────────────────────
-- One row per due cycle, awaiting manager approval before anything sends.
CREATE TABLE IF NOT EXISTS reminder_pending_batches (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  schedule_id     BIGINT UNSIGNED NOT NULL,
  organization_id BIGINT UNSIGNED NOT NULL,
  status          ENUM('PENDING_APPROVAL','CONFIRMED','SKIPPED','EXPIRED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  donor_ids       JSON NOT NULL,
  batch_ids       JSON NULL,
  generated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at     DATETIME NULL,
  resolved_by_id  BIGINT UNSIGNED NULL,
  CONSTRAINT fk_rpb_schedule FOREIGN KEY (schedule_id) REFERENCES reminder_schedules(id) ON DELETE CASCADE,
  CONSTRAINT fk_rpb_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_rpb_resolver FOREIGN KEY (resolved_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_rpb_org_status (organization_id, status)
) ENGINE=InnoDB;

-- ─── 4. Anomalous pools become per-manager ──────────────────────────────────
-- Ownership is now resolved from the campaign's assigned manager at the time
-- an unmatched payment lands (see donor-pool/service.js ensureAnomalousPool).
-- The existing single org-level system pool (created_by_id IS NULL) is kept
-- as the fallback for campaigns with no assigned manager and just renamed so
-- it reads clearly next to the new per-manager ones. No data is moved —
-- existing anomalous donors stay where they are; only new unmatched payments
-- are attributed to a manager going forward.
UPDATE donor_pools
SET name = 'Anomalous / Unmatched (Unassigned)'
WHERE is_system = 1 AND created_by_id IS NULL AND name = 'Anomalous / Unmatched';
