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
  status      VARCHAR(16)   NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── Users, roles and memberships ────────────────────────────────────────────

CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id BIGINT UNSIGNED NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  phone           VARCHAR(32)  NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('SUPER_ADMIN','ORG_ADMIN','CAMPAIGN_MANAGER') NOT NULL DEFAULT 'ORG_ADMIN',
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
  phone             VARCHAR(32)  NOT NULL,
  location          VARCHAR(200) NULL,
  status            ENUM('ACTIVE','PROSPECT','LAPSED','INACTIVE') NOT NULL DEFAULT 'PROSPECT',
  consent_status    ENUM('CONSENTED','PENDING','WITHDRAWN') NOT NULL DEFAULT 'PENDING',
  preferred_channel ENUM('SMS','WHATSAPP','EMAIL','PHONE') NULL DEFAULT 'SMS',
  tags              JSON NULL,
  notes             TEXT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_donors_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY uq_donors_org_phone (organization_id, phone),
  INDEX idx_donors_org_status (organization_id, status)
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
  name                VARCHAR(150) NOT NULL,
  slug                VARCHAR(180) NOT NULL UNIQUE,
  story               TEXT NULL,
  image_url           VARCHAR(500) NULL,
  category            VARCHAR(100) NULL,
  goal_amount         DECIMAL(14,0) NOT NULL,
  service_fee_percent DECIMAL(5,2)  NOT NULL DEFAULT 5.00,
  service_fee_amount  DECIMAL(14,0) NOT NULL DEFAULT 0,
  public_target       DECIMAL(14,0) NOT NULL,
  minimum_amount      DECIMAL(14,0) NOT NULL DEFAULT 1000,
  start_date          DATETIME NULL,
  end_date            DATETIME NULL,
  status              ENUM('DRAFT','PENDING','ACTIVE','PAUSED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  is_public           TINYINT(1) NOT NULL DEFAULT 0,
  contact_phone       VARCHAR(32) NULL,
  raised_amount       DECIMAL(14,0) NOT NULL DEFAULT 0,
  donor_count         INT NOT NULL DEFAULT 0,
  approved_by         BIGINT UNSIGNED NULL,
  approved_at         DATETIME NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_campaigns_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_campaigns_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_campaigns_org_status (organization_id, status)
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
  donor_phone     VARCHAR(32) NULL,
  donor_name      VARCHAR(150) NULL,
  error           TEXT NULL,
  expires_at      DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pa_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE SET NULL,
  CONSTRAINT fk_pa_user FOREIGN KEY (initiated_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pa_campaign_status (campaign_id, status)
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

CREATE TABLE payouts (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id BIGINT UNSIGNED NOT NULL,
  amount          DECIMAL(14,0) NOT NULL,
  status          ENUM('REQUESTED','APPROVED','PAID','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  requested_by_id BIGINT UNSIGNED NULL,
  approved_by_id  BIGINT UNSIGNED NULL,
  approved_at     DATETIME NULL,
  paid_at         DATETIME NULL,
  gateway_ref     VARCHAR(255) NULL,
  notes           TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payouts_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
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

-- =============================================================================
-- DEMO DATA
-- All demo accounts use the password: Changia@2026
-- =============================================================================

-- Super admin (platform owner)
INSERT INTO organizations (name, slug, email, phone, description) VALUES
  ('Dr. Msuya Foundation', 'dr-msuya-foundation', 'info@msuya-foundation.or.tz', '255712000000',
   'Children surgery fund — demo organization for Changia.');

INSERT INTO users (organization_id, first_name, last_name, email, phone, password_hash, role, status) VALUES
  (NULL, 'Changia', 'Super Admin', 'admin@changia.co', '255712000099',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'SUPER_ADMIN', 'ACTIVE'),
  (1, 'Amina', 'Msuya', 'admin@msuya.or.tz', '255712000001',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'ORG_ADMIN', 'ACTIVE'),
  (1, 'Baraka', 'Mushi', 'manager@msuya.or.tz', '255713000002',
   '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'CAMPAIGN_MANAGER', 'ACTIVE');

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
INSERT INTO donors (organization_id, first_name, last_name, phone, status, consent_status, preferred_channel, tags) VALUES
  (1, 'Neema', 'Lema', '255744000001', 'ACTIVE', 'CONSENTED', 'SMS', JSON_ARRAY('first-time')),
  (1, 'James', 'Mdoe', '255755000002', 'ACTIVE', 'CONSENTED', 'SMS', JSON_ARRAY('first-time')),
  (1, 'Grace', 'Komba', '255767000003', 'PROSPECT', 'PENDING', 'SMS', JSON_ARRAY('first-time')),
  (1, 'Emmanuel', 'Swai', '255784000004', 'ACTIVE', 'WITHDRAWN', 'SMS', JSON_ARRAY('first-time'));

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

-- Initial audit trail
INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity) VALUES
  (1, 2, 'admin@msuya.or.tz', 'organization.registered', 'organization', '1', 'INFO'),
  (1, 2, 'admin@msuya.or.tz', 'campaign.approved', 'campaign', '1', 'INFO');
