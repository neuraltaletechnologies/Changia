-- =============================================================================
-- CHANGIA — Digital Fundraising Platform
-- Database: MySQL 8+
--
-- HOW TO IMPORT THIS FILE
--   Option A (phpMyAdmin): open phpMyAdmin → Import → choose this file → Go
--   Option B (command line):
--       mysql -u root -p < database.sql
--   Option C (XAMPP on Windows): use the MySQL tab in the XAMPP Control Panel,
--       or run: C:\xampp\mysql\bin\mysql -u root -p < database.sql
--
-- The file creates the `changia` database, all tables, and demo data.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS changia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE changia;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS campaign_change_requests;
DROP TABLE IF EXISTS campaign_donor_targets;
DROP TABLE IF EXISTS organization_settings;
DROP TABLE IF EXISTS donor_pool_members;
DROP TABLE IF EXISTS donor_pools;
DROP TABLE IF EXISTS donor_payment_methods;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS gateway_events;
DROP TABLE IF EXISTS payment_attempts;
DROP TABLE IF EXISTS message_deliveries;
DROP TABLE IF EXISTS message_batches;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS consents;
DROP TABLE IF EXISTS donors;
DROP TABLE IF EXISTS campaign_assignments;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
SET FOREIGN_KEY_CHECKS = 1;

-- ─── Organizations (tenant boundary) ─────────────────────────────────────────

CREATE TABLE organizations (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150)  NOT NULL,
  slug        VARCHAR(180)  NOT NULL UNIQUE,
  email       VARCHAR(255)  NULL,
  phone       VARCHAR(32)   NULL,
  address     VARCHAR(250)  NULL,
  description TEXT          NULL,
  logo_url    VARCHAR(500)  NULL,
  currency    VARCHAR(8)    NOT NULL DEFAULT 'TZS',
  -- Default campaign service fee for this org (%), added ON TOP of a
  -- campaign's goal (see modules/campaign/service.js computeFees). A
  -- CAMPAIGN_MANAGER creating a campaign doesn't set this — it's applied
  -- automatically unless an ORG_ADMIN/SUPER_ADMIN overrides it per-campaign.
  default_service_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  status      VARCHAR(16)   NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE organization_settings (
  organization_id      BIGINT UNSIGNED PRIMARY KEY,
  registration_number  VARCHAR(100) NULL,
  default_channel      ENUM('SMS','WHATSAPP','EMAIL') NOT NULL DEFAULT 'SMS',
  language             ENUM('en','sw') NOT NULL DEFAULT 'en',
  timezone             ENUM('eat','utc') NOT NULL DEFAULT 'eat',
  date_format          ENUM('dmy','mdy','ymd') NOT NULL DEFAULT 'dmy',
  notifications        JSON NULL,
  security             JSON NULL,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_org_settings_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Users, roles and memberships ────────────────────────────────────────────
-- New accounts always start as CAMPAIGN_MANAGER; an administrator
-- (SUPER_ADMIN / ORG_ADMIN) promotes them to other roles afterwards.

CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id BIGINT UNSIGNED NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  phone           VARCHAR(32)  NULL,
  password_hash   VARCHAR(255) NOT NULL,
  -- REVIEWER is a PLATFORM-level approver (organization_id IS NULL, like
  -- SUPER_ADMIN): it gives the first-stage review on campaigns submitted by
  -- managers across EVERY organisation — plus closure requests, completion
  -- reports and custom service-fee proposals — before an ORG_ADMIN gives the
  -- final approval. It does NOT manage users, platform settings or payouts.
  role            ENUM('SUPER_ADMIN','ORG_ADMIN','REVIEWER','CAMPAIGN_MANAGER') NOT NULL DEFAULT 'CAMPAIGN_MANAGER',
  status          ENUM('ACTIVE','PENDING','INACTIVE') NOT NULL DEFAULT 'PENDING',
  avatar_url      VARCHAR(500) NULL,
  last_login_at   TIMESTAMP    NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  INDEX idx_users_org (organization_id)
) ENGINE=InnoDB;

-- ─── Donors and consents ─────────────────────────────────────────────────────

CREATE TABLE donors (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id   BIGINT UNSIGNED NOT NULL,
  first_name        VARCHAR(100) NULL,
  last_name         VARCHAR(100) NULL,
  email             VARCHAR(255) NULL,
  phone             VARCHAR(32)  NULL,
  location          VARCHAR(200) NULL,
  gender            ENUM('MALE','FEMALE','UNSPECIFIED') NULL,
  position          VARCHAR(150) NULL,
  status            ENUM('ACTIVE','PROSPECT','LAPSED','INACTIVE') NOT NULL DEFAULT 'PROSPECT',
  consent_status    ENUM('CONSENTED','PENDING','WITHDRAWN') NOT NULL DEFAULT 'PENDING',
  preferred_channel ENUM('SMS','WHATSAPP','EMAIL','PHONE') NULL DEFAULT 'SMS',
  is_anomalous      TINYINT(1) NOT NULL DEFAULT 0,
  tags              JSON NULL,
  notes             TEXT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_donors_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY uq_donors_org_phone (organization_id, phone),
  INDEX idx_donors_org_status (organization_id, status)
) ENGINE=InnoDB;

-- ─── Donor pools (segmented lists owned by a campaign manager) ──────────────
-- A pool created by one manager is only visible to that manager (and admins).
-- Every organization automatically gets one system "anomalous" pool that holds
-- donors who paid without a registered profile so they can be re-attached later.

CREATE TABLE donor_pools (
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

CREATE TABLE donor_pool_members (
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

-- Payment methods a donor can be reached/paid through (matching also lets a
-- previously-unmatched payment be re-attached to a known donor).
CREATE TABLE donor_payment_methods (
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

CREATE TABLE consents (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  donor_id     BIGINT UNSIGNED NOT NULL,
  channel      ENUM('SMS','WHATSAPP','EMAIL','PHONE') NOT NULL,
  status       ENUM('CONSENTED','PENDING','WITHDRAWN') NOT NULL DEFAULT 'PENDING',
  source       VARCHAR(64) NULL,
  granted_at   TIMESTAMP NULL,
  revoked_at   TIMESTAMP NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_consents_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  UNIQUE KEY uq_consents_donor_channel (donor_id, channel)
) ENGINE=InnoDB;

-- ─── Campaigns ───────────────────────────────────────────────────────────────

CREATE TABLE campaigns (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id     BIGINT UNSIGNED NOT NULL,
  -- Who created the campaign. Used to keep an approver from approving their own
  -- campaign (neither approval stage may be the creator). NULL for legacy rows.
  created_by_id       BIGINT UNSIGNED NULL,
  name                VARCHAR(150) NOT NULL,
  slug                VARCHAR(180) NOT NULL UNIQUE,
  story               TEXT NULL,
  -- Optional Swahili translation of name/story/category. NULL means "not yet
  -- translated" — public reads fall back to the English column above.
  name_sw             VARCHAR(150) NULL,
  story_sw            TEXT NULL,
  category_sw         VARCHAR(100) NULL,
  image_url           VARCHAR(500) NULL,
  category            VARCHAR(100) NULL,
  goal_amount         DECIMAL(14,0) NOT NULL,
  service_fee_percent DECIMAL(5,2)  NOT NULL DEFAULT 5.00,
  service_fee_amount  DECIMAL(14,0) NOT NULL DEFAULT 0,
  public_target       DECIMAL(14,0) NOT NULL,
  -- Custom service-fee approval flow: a CAMPAIGN_MANAGER can PROPOSE a fee %
  -- that differs from the org default. The proposed value is parked here with
  -- fee_status = 'PENDING' and does NOT affect service_fee_percent / public
  -- target until a REVIEWER/ORG_ADMIN/SUPER_ADMIN approves it. Admins/reviewers
  -- who set a fee themselves apply it immediately (fee_status = 'APPROVED').
  proposed_service_fee_percent DECIMAL(5,2) NULL,
  fee_status          ENUM('NONE','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NONE',
  fee_reviewed_by     BIGINT UNSIGNED NULL,
  fee_reviewed_at     DATETIME NULL,
  fee_review_notes    TEXT NULL,
  minimum_amount      DECIMAL(14,0) NOT NULL DEFAULT 1000,
  start_date          DATETIME NULL,
  end_date            DATETIME NULL,
  -- Strict ordered two-stage approval for EVERY campaign, regardless of who
  -- creates it (no self-approval): DRAFT -> PENDING on create/submit,
  -- PENDING -> REVIEWED on stage-1 sign-off by a REVIEWER (or SUPER_ADMIN),
  -- REVIEWED -> ACTIVE on stage-2 sign-off by an ORG_ADMIN (or SUPER_ADMIN)
  -- who is neither the creator nor the stage-1 approver. Enforced in the
  -- service layer via created_by_id + first_approved_by.
  status              ENUM('DRAFT','PENDING','REVIEWED','ACTIVE','PAUSED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  is_public           TINYINT(1) NOT NULL DEFAULT 0,
  contact_phone       VARCHAR(32) NULL,
  raised_amount       DECIMAL(14,0) NOT NULL DEFAULT 0,
  donor_count         INT NOT NULL DEFAULT 0,
  -- Up to 3 public, active campaigns may be pinned to the marketing homepage
  -- at a time (enforced in the service layer, not the schema).
  is_featured         TINYINT(1) NOT NULL DEFAULT 0,
  featured_at         DATETIME NULL,
  -- First-stage approver (PENDING -> REVIEWED). approved_by/approved_at below
  -- record the second, decisive approval (REVIEWED -> ACTIVE).
  first_approved_by   BIGINT UNSIGNED NULL,
  first_approved_at   DATETIME NULL,
  approved_by         BIGINT UNSIGNED NULL,
  approved_at         DATETIME NULL,
  -- Last reject / "request changes" reason from a reviewer or admin, shown back
  -- to the manager. review_state = 'CHANGES_REQUESTED' while the manager still
  -- needs to act on that feedback. has_pending_changes is a denormalised flag
  -- (see campaign_change_requests) so list views can badge without a join.
  review_notes        TEXT NULL,
  review_state        ENUM('NONE','CHANGES_REQUESTED') NOT NULL DEFAULT 'NONE',
  has_pending_changes TINYINT(1) NOT NULL DEFAULT 0,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_campaigns_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_campaigns_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_campaigns_first_approved_by FOREIGN KEY (first_approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_campaigns_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_campaigns_fee_reviewed_by FOREIGN KEY (fee_reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_campaigns_org_status (organization_id, status),
  INDEX idx_campaigns_featured (is_featured, featured_at)
) ENGINE=InnoDB;

-- Manager → campaign assignment (many-to-many)
CREATE TABLE campaign_assignments (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ca_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ca_campaign_user (campaign_id, user_id)
) ENGINE=InnoDB;

-- Donors tracked for a campaign (imported from pools or added directly) with
-- an optional expected pledge. Payment status (UNPAID / PARTIAL / PAID_FULL)
-- is derived by comparing confirmed donations against expected_amount.
CREATE TABLE campaign_donor_targets (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     BIGINT UNSIGNED NOT NULL,
  donor_id        BIGINT UNSIGNED NOT NULL,
  pool_id         BIGINT UNSIGNED NULL,
  expected_amount DECIMAL(14,0) NULL,
  actual_amount   DECIMAL(14,0) NULL DEFAULT 0,
  payment_status  ENUM('UNPAID','PARTIAL','PAID_FULL') NOT NULL DEFAULT 'UNPAID',
  added_by_id     BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cdt_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_cdt_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  CONSTRAINT fk_cdt_pool FOREIGN KEY (pool_id) REFERENCES donor_pools(id) ON DELETE SET NULL,
  UNIQUE KEY uq_cdt_campaign_donor (campaign_id, donor_id)
) ENGINE=InnoDB;

-- One completion report per campaign: once a campaign is marked COMPLETED,
-- the assigned manager MUST submit a narrative + at least one proof photo of
-- how the funds were used. An ORG_ADMIN/SUPER_ADMIN reviews it — approval is
-- what unblocks that manager from starting a new campaign, and what makes the
-- report eligible to be shown publicly as an impact story.
CREATE TABLE campaign_completion_reports (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     BIGINT UNSIGNED NOT NULL,
  organization_id BIGINT UNSIGNED NOT NULL,
  submitted_by_id BIGINT UNSIGNED NULL,
  summary         TEXT NOT NULL,
  amount_utilized DECIMAL(14,0) NULL,
  status          ENUM('PENDING_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
  submitted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_id  BIGINT UNSIGNED NULL,
  reviewed_at     DATETIME NULL,
  review_notes    TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccr_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccr_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccr_submitted_by FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ccr_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_ccr_campaign (campaign_id),
  INDEX idx_ccr_org_status (organization_id, status)
) ENGINE=InnoDB;

-- Proof photos for a completion report (multer writes them to
-- uploads/completion-reports/<campaignId>/... and this table records the
-- resulting /uploads/... web paths, in display order).
CREATE TABLE campaign_completion_report_images (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id   BIGINT UNSIGNED NOT NULL,
  image_path  VARCHAR(500) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccri_report FOREIGN KEY (report_id) REFERENCES campaign_completion_reports(id) ON DELETE CASCADE,
  INDEX idx_ccri_report (report_id, sort_order)
) ENGINE=InnoDB;

-- Cover + gallery photos set at campaign-creation time (or added later).
-- is_cover=1 is also mirrored onto campaigns.image_url so every existing
-- consumer of that single column keeps working unchanged; the gallery
-- (is_cover=0) is exposed separately as campaign.images[].
CREATE TABLE campaign_images (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT UNSIGNED NOT NULL,
  image_path  VARCHAR(500) NOT NULL,
  is_cover    TINYINT(1) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ci_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  INDEX idx_ci_campaign (campaign_id, sort_order)
) ENGINE=InnoDB;

-- A CAMPAIGN_MANAGER requests permission to close (complete) their campaign,
-- with a reason; an ORG_ADMIN/SUPER_ADMIN approves (→ campaign COMPLETED) or
-- rejects (with a decision note shown back to the manager, who may request
-- again). Full history is kept — no uniqueness constraint — "only one open
-- request at a time" is enforced in the service layer.
CREATE TABLE campaign_closure_requests (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     BIGINT UNSIGNED NOT NULL,
  organization_id BIGINT UNSIGNED NOT NULL,
  requested_by_id BIGINT UNSIGNED NULL,
  reason          TEXT NOT NULL,
  status          ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  decided_by_id   BIGINT UNSIGNED NULL,
  decided_at      DATETIME NULL,
  decision_notes  TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccreq_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccreq_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_ccreq_campaign_status (campaign_id, status)
) ENGINE=InnoDB;

-- A material edit (name, story, goal, fee, category, dates, minimum amount,
-- contact phone, cover image) to an already-approved / live campaign is NOT
-- applied directly — it is parked here as a payload and must clear the same
-- strict two-stage chain (REVIEWER then ORG_ADMIN) before it is written onto
-- the campaign. The live campaign keeps serving its last-approved values
-- meanwhile. "Only one open request per campaign" (PENDING / REVIEWED /
-- CHANGES_REQUESTED) is enforced in the service layer.
CREATE TABLE campaign_change_requests (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id       BIGINT UNSIGNED NOT NULL,
  organization_id   BIGINT UNSIGNED NOT NULL,
  submitted_by_id   BIGINT UNSIGNED NULL,
  payload           JSON NOT NULL,
  staged_cover_path VARCHAR(500) NULL,
  status            ENUM('PENDING','REVIEWED','APPLIED','REJECTED','CHANGES_REQUESTED') NOT NULL DEFAULT 'PENDING',
  first_approved_by BIGINT UNSIGNED NULL,
  first_approved_at DATETIME NULL,
  approved_by       BIGINT UNSIGNED NULL,
  approved_at       DATETIME NULL,
  review_notes      TEXT NULL,
  decided_at        DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccr2_campaign  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccr2_org       FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccr2_submitter FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ccr2_first     FOREIGN KEY (first_approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ccr2_approver  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_ccr2_campaign_status (campaign_id, status),
  INDEX idx_ccr2_org_status (organization_id, status)
) ENGINE=InnoDB;

-- ─── Message batches and deliveries ──────────────────────────────────────────

CREATE TABLE message_batches (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id BIGINT UNSIGNED NOT NULL,
  campaign_id     BIGINT UNSIGNED NULL,
  created_by_id   BIGINT UNSIGNED NULL,
  type            ENUM('SMS','WHATSAPP','EMAIL') NOT NULL,
  subject         VARCHAR(255) NULL,
  body            TEXT NOT NULL,
  status          ENUM('DRAFT','SCHEDULED','SENDING','SENT','PARTIAL','FAILED') NOT NULL DEFAULT 'DRAFT',
  recipient_count INT NOT NULL DEFAULT 0,
  sent_at         DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mb_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_mb_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE message_deliveries (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id    BIGINT UNSIGNED NOT NULL,
  donor_id    BIGINT UNSIGNED NULL,
  recipient   VARCHAR(255) NOT NULL,
  status      ENUM('QUEUED','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'QUEUED',
  provider_ref VARCHAR(255) NULL,
  error       TEXT NULL,
  sent_at     DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_md_batch FOREIGN KEY (batch_id) REFERENCES message_batches(id) ON DELETE CASCADE,
  CONSTRAINT fk_md_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Message templates and reminder auto-resend schedules ───────────────────
-- Reusable per-channel templates ({{donorName}}, {{amountDue}}, {{campaignName}},
-- {{orgName}} placeholders rendered at send time) and the automatic resend
-- scheduler config. A schedule never sends by itself — the scheduler job only
-- creates a reminder_pending_batches row for the manager to review and
-- confirm each cycle (see Backend/jobs/reminderScheduler.js).

CREATE TABLE message_templates (
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

CREATE TABLE reminder_schedules (
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

CREATE TABLE reminder_pending_batches (
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

-- ─── Payments: attempts, gateway events, donations ───────────────────────────

CREATE TABLE payment_attempts (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     BIGINT UNSIGNED NOT NULL,
  donor_id        BIGINT UNSIGNED NULL,
  organization_id BIGINT UNSIGNED NOT NULL,
  initiated_by_id BIGINT UNSIGNED NULL,
  method          ENUM('LINK','PUSH') NOT NULL,
  amount          DECIMAL(14,0) NOT NULL,
  status          ENUM('PENDING','SUCCESS','FAILED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  idempotency_key VARCHAR(64) NOT NULL UNIQUE,
  gateway_ref     VARCHAR(255) NULL,
  provider        VARCHAR(64) NULL,
  donor_phone     VARCHAR(32) NULL,
  donor_name      VARCHAR(150) NULL,
  donor_email     VARCHAR(255) NULL,
  campaign_donor_target_id BIGINT UNSIGNED NULL,
  error           TEXT NULL,
  expires_at      DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pa_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL,
  CONSTRAINT fk_pa_user FOREIGN KEY (initiated_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pa_cdt FOREIGN KEY (campaign_donor_target_id) REFERENCES campaign_donor_targets(id) ON DELETE SET NULL,
  INDEX idx_pa_campaign_status (campaign_id, status),
  INDEX idx_pa_cdt (campaign_donor_target_id)
) ENGINE=InnoDB;

CREATE TABLE gateway_events (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider        VARCHAR(64) NOT NULL,
  event_type      VARCHAR(64) NOT NULL,
  reference       VARCHAR(255) NULL,
  idempotency_key VARCHAR(64) NOT NULL UNIQUE,
  raw_payload     JSON NULL,
  verified        TINYINT(1) NOT NULL DEFAULT 0,
  processed_at    DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ge_provider_ref (provider, reference)
) ENGINE=InnoDB;

CREATE TABLE donations (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id    BIGINT UNSIGNED NOT NULL,
  campaign_id        BIGINT UNSIGNED NOT NULL,
  donor_id           BIGINT UNSIGNED NULL,
  payment_attempt_id BIGINT UNSIGNED NULL UNIQUE,
  amount             DECIMAL(14,0) NOT NULL,
  method             ENUM('LINK','PUSH') NOT NULL,
  status             ENUM('PENDING','CONFIRMED','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  donor_name         VARCHAR(150) NULL,
  donor_phone        VARCHAR(32) NULL,
  donor_email        VARCHAR(255) NULL,
  is_anonymous       TINYINT(1) NOT NULL DEFAULT 0,
  receipt_number     VARCHAR(32) NULL UNIQUE,
  gateway_ref        VARCHAR(255) NULL,
  confirmed_at       DATETIME NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_donations_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_donations_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_donations_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL,
  CONSTRAINT fk_donations_attempt FOREIGN KEY (payment_attempt_id) REFERENCES payment_attempts(id) ON DELETE SET NULL,
  INDEX idx_donations_org_status (organization_id, status),
  INDEX idx_donations_campaign_status (campaign_id, status)
) ENGINE=InnoDB;

CREATE TABLE receipts (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  donation_id     BIGINT UNSIGNED NOT NULL,
  channel         ENUM('SMS','WHATSAPP','EMAIL','PHONE') NOT NULL,
  delivery_status ENUM('QUEUED','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'QUEUED',
  provider_ref    VARCHAR(255) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_receipts_donation FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Fees, payouts and settlements ───────────────────────────────────────────

-- A payout can be requested at the organization level (SUPER_ADMIN/ORG_ADMIN,
-- campaign_id NULL) or by a CAMPAIGN_MANAGER for one of their assigned
-- campaigns (campaign_id set, reason required). `reason` is the requester's
-- own justification; `notes` stays the admin's decision note (unchanged
-- COALESCE-on-decide behavior) — shown back to the requester as why a
-- request was rejected.
CREATE TABLE payouts (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id BIGINT UNSIGNED NOT NULL,
  campaign_id     BIGINT UNSIGNED NULL,
  amount          DECIMAL(14,0) NOT NULL,
  reason          TEXT NULL,
  status          ENUM('REQUESTED','APPROVED','PAID','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  requested_by_id BIGINT UNSIGNED NULL,
  approved_by_id  BIGINT UNSIGNED NULL,
  approved_at     DATETIME NULL,
  paid_at         DATETIME NULL,
  gateway_ref     VARCHAR(255) NULL,
  notes           TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payouts_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_payouts_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
  INDEX idx_payouts_campaign_status (campaign_id, status)
) ENGINE=InnoDB;

-- ─── Audit logs (immutable, security-relevant) ───────────────────────────────

CREATE TABLE audit_logs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id BIGINT UNSIGNED NULL,
  actor_id        BIGINT UNSIGNED NULL,
  actor_email     VARCHAR(255) NULL,
  action          VARCHAR(100) NOT NULL,
  resource        VARCHAR(64) NOT NULL,
  resource_id     VARCHAR(64) NULL,
  ip_address      VARCHAR(64) NULL,
  user_agent      VARCHAR(500) NULL,
  details         JSON NULL,
  severity        ENUM('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'INFO',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_user FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_org_created (organization_id, created_at),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB;

-- ─── In-app notifications (per-user staff notification centre) ────────────────
-- A lightweight per-user feed surfaced by the dashboard header bell and the
-- /dashboard/notifications page. Written fire-and-forget (never inside a
-- mutation transaction) on approval-chain events — see modules/notification.
CREATE TABLE notifications (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  organization_id BIGINT UNSIGNED NULL,
  type            VARCHAR(48) NOT NULL DEFAULT 'system',
  title           VARCHAR(200) NOT NULL,
  body            VARCHAR(600) NULL,
  link            VARCHAR(300) NULL,
  resource        VARCHAR(48) NULL,
  resource_id     VARCHAR(48) NULL,
  read_at         DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_org  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_notif_user_unread (user_id, read_at, created_at),
  INDEX idx_notif_user_created (user_id, created_at)
) ENGINE=InnoDB;

-- =============================================================================
-- DEMO DATA
-- All demo accounts use the password: Changia@2026
-- =============================================================================

-- Super admin (platform owner)
INSERT INTO organizations (name, slug, email, phone, description) VALUES
  ('Dr. Msuya Foundation', 'dr-msuya-foundation', 'info@msuya-foundation.org.tz', '255712000000',
   'Children surgery fund — demo organization for Changia.');

INSERT INTO users (organization_id, first_name, last_name, email, phone, password_hash, role, status) VALUES
  (NULL, 'Changia', 'Super Admin', 'admin@changia.org.tz', '255712000099',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'SUPER_ADMIN', 'ACTIVE'),
  (1, 'Amina', 'Msuya', 'admin@msuya-foundation.org.tz', '255712000001',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'ORG_ADMIN', 'ACTIVE'),
  (1, 'Baraka', 'Mushi', 'manager@msuya-foundation.org.tz', '255713000002',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'CAMPAIGN_MANAGER', 'ACTIVE'),
  -- Platform reviewers (organization_id NULL) — they vet campaigns for every
  -- org, then an ORG_ADMIN gives the final approval. Two are seeded so the
  -- "two different approvers" rule is testable end to end.
  (NULL, 'Zainab', 'Kileo', 'reviewer@msuya-foundation.org.tz', '255713000003',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'REVIEWER', 'ACTIVE'),
  (NULL, 'Elias', 'Mrema', 'reviewer2@msuya-foundation.org.tz', '255713000004',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'REVIEWER', 'ACTIVE');

-- Active campaign with 5% service fee (goal 10,000,000 → target 10,500,000)
INSERT INTO campaigns
  (organization_id, name, slug, story, goal_amount, service_fee_percent, service_fee_amount, public_target,
   minimum_amount, status, is_public, start_date, end_date, approved_by, approved_at)
VALUES
  (1, 'Children Surgery Fund', 'children-surgery-fund',
   'Help us raise funds for life-changing surgery for children in need at the Msuya Foundation.',
   10000000, 5.00, 500000, 10500000, 1000, 'ACTIVE', 1, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 2, NOW());

INSERT INTO campaign_assignments (campaign_id, user_id) VALUES (1, 3);

-- Donors
INSERT INTO donors (organization_id, first_name, last_name, phone, gender, position, status, consent_status, preferred_channel, tags) VALUES
  (1, 'Neema', 'Lema', '255744000001', 'FEMALE', 'Teacher', 'ACTIVE', 'CONSENTED', 'SMS', JSON_ARRAY('first-time')),
  (1, 'James', 'Mdoe', '255755000002', 'MALE', 'Engineer', 'ACTIVE', 'CONSENTED', 'SMS', JSON_ARRAY('first-time')),
  (1, 'Grace', 'Komba', '255767000003', 'FEMALE', 'Nurse', 'PROSPECT', 'PENDING', 'SMS', JSON_ARRAY('first-time')),
  (1, 'Emmanuel', 'Swai', '255784000004', 'MALE', 'Farmer', 'ACTIVE', 'WITHDRAWN', 'SMS', JSON_ARRAY('first-time'));

-- Anomalous pool: holds donors who paid without a registered profile so they
-- can be re-attached to a known donor later.
INSERT INTO donor_pools (organization_id, created_by_id, name, category, is_system, status) VALUES
  (1, NULL, 'Anomalous / Unmatched', 'FAMILY', 1, 'ACTIVE');

INSERT INTO donor_pool_members (pool_id, donor_id, expected_amount, added_by_id) VALUES
  (1, 1, 100000, 3),
  (1, 2, 100000, 3);

INSERT INTO consents (donor_id, channel, status, source, granted_at) VALUES
  (1, 'SMS', 'CONSENTED', 'manual', NOW()),
  (2, 'SMS', 'CONSENTED', 'manual', NOW());

-- Confirmed donations (receipts)
INSERT INTO donations
  (organization_id, campaign_id, donor_id, amount, method, status, donor_name, receipt_number, confirmed_at, created_at)
VALUES
  (1, 1, 1, 50000, 'LINK', 'CONFIRMED', 'Neema Lema', 'CHG-2026-001001', DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY)),
  (1, 1, 2, 100000, 'LINK', 'CONFIRMED', 'James Mdoe', 'CHG-2026-001002', DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY)),
  (1, 1, NULL, 20000, 'LINK', 'CONFIRMED', NULL, 'CHG-2026-001003', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (1, 1, 1, 75000, 'PUSH', 'CONFIRMED', 'Neema Lema', 'CHG-2026-001004', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY));

-- Recompute campaign totals from confirmed donations
UPDATE campaigns SET
  raised_amount = (SELECT COALESCE(SUM(amount),0) FROM donations WHERE campaign_id = 1 AND status = 'CONFIRMED'),
  donor_count   = (SELECT COUNT(*) FROM donations WHERE campaign_id = 1 AND status = 'CONFIRMED')
WHERE id = 1;

-- More public, active demo campaigns so the marketing site (featured homepage
-- picks + the public /campaigns listing) has real data to show out of the box.
-- raised_amount / donor_count are seeded directly here for demo purposes only
-- — in normal operation they're only ever updated by a confirmed donation.
INSERT INTO campaigns
  (organization_id, name, slug, story, category, goal_amount, service_fee_percent, service_fee_amount, public_target,
   minimum_amount, status, is_public, contact_phone, raised_amount, donor_count, start_date, end_date, approved_by, approved_at)
VALUES
  (1, 'School Fees for Twins', 'school-fees-for-twins',
   'Grace and Faith are twin sisters who both passed their Form One exams but their family cannot cover this year''s school fees and uniforms. Help keep them in class.',
   'Education', 1500000, 5.00, 75000, 1575000, 1000, 'ACTIVE', 1, '255715000010', 640000, 18,
   DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_ADD(NOW(), INTERVAL 40 DAY), 2, DATE_SUB(NOW(), INTERVAL 20 DAY)),
  (1, 'Community Borehole Project', 'community-borehole-project',
   'Kigamboni ward shares one working well between six hundred households. A second borehole would cut the walk for clean water from two hours to twenty minutes.',
   'Community', 8000000, 5.00, 400000, 8400000, 2000, 'ACTIVE', 1, '255715000011', 3120000, 54,
   DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_ADD(NOW(), INTERVAL 55 DAY), 2, DATE_SUB(NOW(), INTERVAL 35 DAY)),
  (1, 'Widows Relief Fund', 'widows-relief-fund',
   'A standing fund that delivers monthly food and medical support to twelve widows in the Msuya Foundation''s care network.',
   'Welfare', 4000000, 5.00, 200000, 4200000, 1000, 'ACTIVE', 1, '255715000012', 980000, 26,
   DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_ADD(NOW(), INTERVAL 120 DAY), 2, DATE_SUB(NOW(), INTERVAL 60 DAY)),
  (1, 'Youth Football Academy Kits', 'youth-football-academy-kits',
   'Thirty players from the Temeke youth league need boots, jerseys and a proper ball set to compete in this season''s regional tournament.',
   'Sports', 2200000, 5.00, 110000, 2310000, 1000, 'ACTIVE', 1, '255715000013', 705000, 21,
   DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY), 2, DATE_SUB(NOW(), INTERVAL 15 DAY)),
  (1, 'Flood Relief - Kilombero', 'flood-relief-kilombero',
   'Seasonal flooding displaced forty families along the Kilombero river. Funds go directly to emergency shelter, clean water and food.',
   'Emergency', 6000000, 5.00, 300000, 6300000, 1000, 'ACTIVE', 1, '255715000014', 4450000, 89,
   DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_ADD(NOW(), INTERVAL 22 DAY), 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
  (1, 'Maternal Health Outreach', 'maternal-health-outreach',
   'Mobile prenatal check-ups and safe-delivery kits for expectant mothers in villages without a nearby clinic.',
   'Health', 5000000, 5.00, 250000, 5250000, 1000, 'ACTIVE', 1, '255715000015', 1875000, 37,
   DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_ADD(NOW(), INTERVAL 65 DAY), 2, DATE_SUB(NOW(), INTERVAL 25 DAY)),
  (1, 'Elder Care Home Renovation', 'elder-care-home-renovation',
   'The Msuya Foundation''s elder care home needs a new roof and accessible bathrooms before the next rainy season.',
   'Community', 7500000, 5.00, 375000, 7875000, 2000, 'ACTIVE', 1, '255715000016', 2025000, 31,
   DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_ADD(NOW(), INTERVAL 45 DAY), 2, DATE_SUB(NOW(), INTERVAL 45 DAY));

-- Feature 3 public, active campaigns on the marketing homepage (the platform-
-- wide cap of 3 is enforced by the service layer on every future toggle).
UPDATE campaigns SET is_featured = 1, featured_at = DATE_SUB(NOW(), INTERVAL 12 DAY) WHERE id = 1;
UPDATE campaigns SET is_featured = 1, featured_at = DATE_SUB(NOW(), INTERVAL 8 DAY)  WHERE slug = 'school-fees-for-twins';
UPDATE campaigns SET is_featured = 1, featured_at = DATE_SUB(NOW(), INTERVAL 3 DAY)  WHERE slug = 'community-borehole-project';

-- Swahili translations for the 3 featured campaigns, so a fresh import shows
-- the /sw public pages fully localized out of the box. Every other campaign
-- is left untranslated on purpose to demonstrate the English fallback.
UPDATE campaigns SET
  name_sw = 'Mfuko wa Upasuaji wa Watoto',
  story_sw = 'Tusaidie kukusanya fedha kwa upasuaji wa watoto wanaohitaji katika Msuya Foundation.',
  category_sw = 'Afya'
WHERE id = 1;
UPDATE campaigns SET
  name_sw = 'Ada za Shule kwa Mapacha',
  story_sw = 'Grace na Faith ni mapacha waliofaulu mtihani wa kidato cha kwanza lakini familia yao haiwezi kulipa ada za mwaka huu na sare za shule. Tusaidie kuwaweka darasani.',
  category_sw = 'Elimu'
WHERE slug = 'school-fees-for-twins';
UPDATE campaigns SET
  name_sw = 'Mradi wa Kisima cha Jamii',
  story_sw = 'Kata ya Kigamboni inashiriki kisima kimoja kinachofanya kazi kati ya kaya mia sita. Kisima cha pili kingepunguza muda wa kutembea kufuata maji safi kutoka saa mbili hadi dakika ishirini.',
  category_sw = 'Jamii'
WHERE slug = 'community-borehole-project';

-- Initial audit trail
INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity) VALUES
  (1, 2, 'admin@changia.org.tz', 'organization.registered', 'organization', '1', 'INFO'),
  (1, 2, 'admin@changia.org.tz', 'campaign.approved', 'campaign', '1', 'INFO');
