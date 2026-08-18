-- =============================================================================
-- CHANGIA — Migration: Campaign completion reports (mandatory proof of fund
-- usage) + their proof photos.
-- Date: 18 Aug 2026
--
-- Once a campaign is marked COMPLETED, the assigned manager must submit a
-- narrative + at least one proof photo of how the funds were used. An
-- ORG_ADMIN/SUPER_ADMIN reviews it — approval unblocks that manager from
-- starting a new campaign and makes the report eligible to show publicly as
-- an impact story on the blog.
--
-- For a fresh install just import database.sql instead (it already includes
-- everything below). This script is idempotent: every change is guarded so
-- it can be run more than once safely.
--
--   mysql -u root -p changia < migrations/2026_08_18_campaign_completion_reports.sql
-- =============================================================================

USE changia;

CREATE TABLE IF NOT EXISTS campaign_completion_reports (
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

CREATE TABLE IF NOT EXISTS campaign_completion_report_images (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id   BIGINT UNSIGNED NOT NULL,
  image_path  VARCHAR(500) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ccri_report FOREIGN KEY (report_id) REFERENCES campaign_completion_reports(id) ON DELETE CASCADE,
  INDEX idx_ccri_report (report_id, sort_order)
) ENGINE=InnoDB;
