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
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reminder_pending_batches;
DROP TABLE IF EXISTS reminder_schedules;
DROP TABLE IF EXISTS message_templates;
DROP TABLE IF EXISTS campaign_gifts;
DROP TABLE IF EXISTS campaign_change_requests;
DROP TABLE IF EXISTS campaign_closure_requests;
DROP TABLE IF EXISTS campaign_completion_report_images;
DROP TABLE IF EXISTS campaign_completion_reports;
DROP TABLE IF EXISTS campaign_images;
DROP TABLE IF EXISTS campaign_donor_targets;
DROP TABLE IF EXISTS organization_settings;
DROP TABLE IF EXISTS donor_pool_members;
DROP TABLE IF EXISTS donor_pools;
DROP TABLE IF EXISTS donor_payment_methods;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS payout_images;
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
  -- Set to 1 for admin-created accounts (temporary password). The dashboard
  -- forces a password change before anything else; changePassword clears it.
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
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
  category        ENUM('FAMILY','SCHOOL','STUDENT','OFFICE','ALUMNI','COMMUNITY','CHURCH','BUSINESS','FRIENDS','OTHER') NOT NULL DEFAULT 'FAMILY',
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
  -- "Scope" = what the funds will deliver; "Acceptance" = how a supporter knows
  -- their contribution landed / the campaign delivered. Shown on the public
  -- campaign tabs. Swahili variants are auto-filled on save.
  scope               TEXT NULL,
  acceptance          TEXT NULL,
  scope_sw            TEXT NULL,
  acceptance_sw       TEXT NULL,
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
  -- service layer via created_by_id + first_approved_by. A reviewer's hard
  -- "reject" parks the campaign at REJECTED (not the terminal CANCELLED) so
  -- the manager can fix and re-submit it straight back to PENDING.
  status              ENUM('DRAFT','PENDING','REVIEWED','ACTIVE','PAUSED','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'DRAFT',
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
  first_reviewed_by_id BIGINT UNSIGNED NULL,
  first_reviewed_at    DATETIME NULL,
  summary         TEXT NOT NULL,
  amount_utilized DECIMAL(14,0) NULL,
  -- Two-stage chain (mirrors payouts / closure requests): PENDING_REVIEW
  -- (stage 1, a REVIEWER) → REVIEWED (stage 2, an ORG_ADMIN) → APPROVED.
  status          ENUM('PENDING_REVIEW','REVIEWED','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
  submitted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_id  BIGINT UNSIGNED NULL,
  reviewed_at     DATETIME NULL,
  review_notes    TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccr_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccr_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccr_submitted_by FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ccr_first_reviewer FOREIGN KEY (first_reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL,
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
  -- A gallery photo added to / removed from a LIVE campaign is staged for the
  -- same two-stage review as a cover change: 'ADD' = uploaded but not yet
  -- public, 'REMOVE' = still public until the campaign's change request clears.
  pending_change ENUM('NONE','ADD','REMOVE') NOT NULL DEFAULT 'NONE',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ci_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  INDEX idx_ci_campaign (campaign_id, sort_order)
) ENGINE=InnoDB;

-- A CAMPAIGN_MANAGER requests permission to close (complete) their campaign,
-- with a reason. It then clears the same two-stage chain as payouts / campaign
-- change requests: a REVIEWER's first review (PENDING → REVIEWED), then an
-- ORG_ADMIN/SUPER_ADMIN's final approval (REVIEWED → APPROVED, campaign →
-- COMPLETED). Either stage can reject / request changes (→ REJECTED, with a
-- decision note shown back to the manager, who may request again).
-- first_approved_by_id/at record the stage-1 sign-off so stage 2 must be a
-- different person. Full history is kept — no uniqueness constraint — "only one
-- open request at a time" is enforced in the service layer.
CREATE TABLE campaign_closure_requests (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id          BIGINT UNSIGNED NOT NULL,
  organization_id      BIGINT UNSIGNED NOT NULL,
  requested_by_id      BIGINT UNSIGNED NULL,
  first_approved_by_id BIGINT UNSIGNED NULL,
  first_approved_at    DATETIME NULL,
  reason               TEXT NOT NULL,
  status               ENUM('PENDING','REVIEWED','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  decided_by_id        BIGINT UNSIGNED NULL,
  decided_at           DATETIME NULL,
  decision_notes       TEXT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccreq_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccreq_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_ccreq_first_approver FOREIGN KEY (first_approved_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_ccreq_campaign_status (campaign_id, status)
) ENGINE=InnoDB;

-- In-kind ("gift") contributions to a campaign — not all support is money.
-- Each row is a non-monetary contribution with an *estimated* TZS value so it
-- can sit alongside cash figures in the campaign payment breakdown. Optionally
-- attributed to a known donor.
--
-- A row is either recorded by staff after the fact (source = 'STAFF',
-- status = 'RECEIVED') or pledged by a visitor on the public campaign page
-- (source = 'PUBLIC', status = 'PLEDGED'). A public pledge carries the donor's
-- own contact details plus how the item changes hands — either the team picks
-- it up (delivery_method = 'PICKUP', pickup_address set) or the donor delivers
-- it themselves (delivery_method = 'DROP_OFF'). The assigned campaign manager
-- then advances it PLEDGED -> SCHEDULED -> RECEIVED (or CANCELLED).
CREATE TABLE campaign_gifts (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     BIGINT UNSIGNED NOT NULL,
  organization_id BIGINT UNSIGNED NOT NULL,
  donor_id        BIGINT UNSIGNED NULL,
  description     VARCHAR(300) NOT NULL,
  estimated_value DECIMAL(14,0) NOT NULL DEFAULT 0,
  received_at     DATE NULL,
  recorded_by_id  BIGINT UNSIGNED NULL,
  source          ENUM('STAFF','PUBLIC') NOT NULL DEFAULT 'STAFF',
  status          ENUM('PLEDGED','SCHEDULED','RECEIVED','CANCELLED') NOT NULL DEFAULT 'RECEIVED',
  delivery_method ENUM('PICKUP','DROP_OFF') NULL,
  donor_name      VARCHAR(150) NULL,
  donor_phone     VARCHAR(32) NULL,
  donor_email     VARCHAR(255) NULL,
  pickup_address  VARCHAR(400) NULL,
  preferred_date  DATE NULL,
  note            VARCHAR(600) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gift_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_gift_org      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_gift_donor    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL,
  CONSTRAINT fk_gift_recorder FOREIGN KEY (recorded_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_gift_campaign (campaign_id)
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
  -- EDIT: a parked material edit (payload = changed fields). STATUS: a
  -- manager's PAUSE/RESUME request (status_action set, payload = { reason }).
  -- Both clear the same two-stage chain (REVIEWER then ORG_ADMIN).
  request_kind      ENUM('EDIT','STATUS') NOT NULL DEFAULT 'EDIT',
  status_action     ENUM('PAUSE','RESUME') NULL,
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

-- A payout is requested by a CAMPAIGN_MANAGER for one of their assigned
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
  -- Approval + release chain (mirrors two-stage campaign approval):
  --   REQUESTED -> REVIEWED  (stage 1 — a REVIEWER/SUPER_ADMIN, not the requester)
  --             -> APPROVED  (stage 2 — an ORG_ADMIN/SUPER_ADMIN, a different person;
  --                           funds now sit on hold)
  --             -> PAID      (the requesting CAMPAIGN_MANAGER confirms the release,
  --                           which atomically fires the ClickPesa mobile-money transfer)
  status          ENUM('REQUESTED','REVIEWED','APPROVED','PAID','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  requested_by_id BIGINT UNSIGNED NULL,
  first_approved_by_id BIGINT UNSIGNED NULL,
  first_approved_at    DATETIME NULL,
  approved_by_id  BIGINT UNSIGNED NULL,
  approved_at     DATETIME NULL,
  confirmed_by_id BIGINT UNSIGNED NULL,
  confirmed_at    DATETIME NULL,
  paid_at         DATETIME NULL,
  gateway_ref     VARCHAR(255) NULL,
  notes           TEXT NULL,
  -- Mobile-money payout destination, captured with the request. (Bank columns
  -- are kept for history / a future bank option but are not populated today.)
  disbursement_method          ENUM('MOBILE_MONEY','BANK') NULL,
  disbursement_provider        VARCHAR(40) NULL,
  disbursement_account_name    VARCHAR(120) NULL,
  disbursement_account_number  VARCHAR(40) NULL,
  disbursement_phone           VARCHAR(20) NULL,
  disbursement_bank_name       VARCHAR(120) NULL,
  disbursement_branch          VARCHAR(120) NULL,
  disbursement_submitted_at    DATETIME NULL,
  disbursement_submitted_by_id BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payouts_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_payouts_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
  CONSTRAINT fk_payouts_first_approver FOREIGN KEY (first_approved_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_payouts_checkout_by FOREIGN KEY (disbursement_submitted_by_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_payouts_confirmed_by FOREIGN KEY (confirmed_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_payouts_campaign_status (campaign_id, status)
) ENGINE=InnoDB;

-- Optional "proof of use" photos a CAMPAIGN_MANAGER attaches to a payout
-- request (invoices, receipts, delivery/site photos) so the reviewer and org
-- admin can see why the money is needed. Up to 5 per request; only editable
-- while the request is still in the approval chain (REQUESTED / REVIEWED).
CREATE TABLE payout_images (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payout_id   BIGINT UNSIGNED NOT NULL,
  image_path  VARCHAR(500) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pi_payout FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE,
  INDEX idx_pi_payout (payout_id, sort_order)
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

-- ─── Password reset tokens ───────────────────────────────────────────────────
-- One row per "forgot password" request. Only the SHA-256 hash of the token is
-- stored; the raw token travels in the emailed reset link. A row is single-use
-- (used_at) and short-lived (expires_at, ~1h). requestPasswordReset clears any
-- earlier unused rows for the same user before inserting a fresh one.
CREATE TABLE password_reset_tokens (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  token_hash      CHAR(64) NOT NULL,
  expires_at      DATETIME NOT NULL,
  used_at         DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_prt_token (token_hash),
  INDEX idx_prt_user (user_id)
) ENGINE=InnoDB;

-- =============================================================================
-- DEMO DATA
-- All demo accounts use the password: Changia@2026
--
-- Only the login accounts are seeded — no demo campaigns, donors, pools,
-- donations, payouts, messages or audit history. A fresh import starts empty
-- and everything is created through the app.
-- =============================================================================

-- The demo campaign manager's organization (CAMPAIGN_MANAGER is the only
-- org-scoped role — see the users table comment).
INSERT INTO organizations (name, slug, email, phone, description) VALUES
  ('Dr. Msuya Foundation', 'dr-msuya-foundation', 'info@msuya-foundation.org.tz', '255712000000',
   'Children surgery fund — demo organization for Changia.');

INSERT INTO users (organization_id, first_name, last_name, email, phone, password_hash, role, status) VALUES
  (NULL, 'Changia', 'Super Admin', 'admin@changia.org.tz', '255712000099',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'SUPER_ADMIN', 'ACTIVE'),
  -- ORG_ADMIN is PLATFORM-level (organization_id NULL, like SUPER_ADMIN /
  -- REVIEWER) — it gives the final (stage-2) approval on campaigns AND payouts
  -- across every organisation, not one.
  (NULL, 'Amina', 'Msuya', 'admin@msuya-foundation.org.tz', '255712000001',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'ORG_ADMIN', 'ACTIVE'),
  (1, 'Baraka', 'Mushi', 'manager@msuya-foundation.org.tz', '255713000002',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'CAMPAIGN_MANAGER', 'ACTIVE'),
  -- Platform reviewer (organization_id NULL) — vets campaigns for every org,
  -- then an ORG_ADMIN gives the final approval.
  (NULL, 'Zainab', 'Kileo', 'reviewer@msuya-foundation.org.tz', '255713000003',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'REVIEWER', 'ACTIVE');
