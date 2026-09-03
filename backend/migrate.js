/**
 * Lightweight auto-migration: adds missing columns to existing tables so the
 * running database stays in sync with the latest schema without requiring a
 * full re-import.
 */
const db = require("./db");
const { env } = require("./config");

const MIGRATIONS = [
  // campaigns — Swahili translation columns
  `ALTER TABLE campaigns ADD COLUMN name_sw      VARCHAR(150) NULL AFTER story`,
  `ALTER TABLE campaigns ADD COLUMN story_sw     TEXT NULL AFTER name_sw`,
  `ALTER TABLE campaigns ADD COLUMN category_sw  VARCHAR(100) NULL AFTER story_sw`,

  // campaigns — "Scope" (what the funds will deliver) and "Acceptance"
  // (how supporters know a contribution was accepted / the campaign delivered)
  // shown on the public campaign tabs. Swahili variants are auto-filled on save
  // alongside name/story/category.
  `ALTER TABLE campaigns ADD COLUMN scope           TEXT NULL AFTER category_sw`,
  `ALTER TABLE campaigns ADD COLUMN acceptance      TEXT NULL AFTER scope`,
  `ALTER TABLE campaigns ADD COLUMN scope_sw        TEXT NULL AFTER acceptance`,
  `ALTER TABLE campaigns ADD COLUMN acceptance_sw   TEXT NULL AFTER scope_sw`,

  // donor_pools — extra segment categories beyond the original four.
  `ALTER TABLE donor_pools MODIFY COLUMN category ENUM('FAMILY','SCHOOL','STUDENT','OFFICE','ALUMNI','COMMUNITY','CHURCH','BUSINESS','FRIENDS','OTHER') NOT NULL DEFAULT 'FAMILY'`,

  // campaigns — featured columns
  `ALTER TABLE campaigns ADD COLUMN is_featured  TINYINT(1) NOT NULL DEFAULT 0 AFTER donor_count`,
  `ALTER TABLE campaigns ADD COLUMN featured_at  DATETIME NULL AFTER is_featured`,
  `ALTER TABLE campaigns ADD INDEX idx_campaigns_featured (is_featured, featured_at)`,

  // payouts — campaign-scoped manager requests (reason kept separate from
  // the admin's decision `notes`)
  `ALTER TABLE payouts ADD COLUMN campaign_id BIGINT UNSIGNED NULL AFTER organization_id`,
  `ALTER TABLE payouts ADD COLUMN reason      TEXT NULL AFTER amount`,
  `ALTER TABLE payouts ADD CONSTRAINT fk_payouts_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL`,
  `ALTER TABLE payouts ADD INDEX idx_payouts_campaign_status (campaign_id, status)`,

  // payouts — two-stage approval chain (mirrors two-stage campaign approval):
  //   REQUESTED -> REVIEWED (stage 1, a REVIEWER/SUPER_ADMIN, not the requester)
  //             -> APPROVED (stage 2, an ORG_ADMIN/SUPER_ADMIN, a different person, not the requester)
  //             -> PAID     (SUPER_ADMIN marks the gateway transfer done)
  // first_approved_by_id/at track the stage-1 sign-off so the service can require
  // a *different* person for stage 2; approved_by_id/at stay as the stage-2 columns.
  `ALTER TABLE payouts MODIFY COLUMN status ENUM('REQUESTED','REVIEWED','APPROVED','PAID','REJECTED') NOT NULL DEFAULT 'REQUESTED'`,
  `ALTER TABLE payouts ADD COLUMN first_approved_by_id BIGINT UNSIGNED NULL AFTER requested_by_id`,
  `ALTER TABLE payouts ADD COLUMN first_approved_at DATETIME NULL AFTER first_approved_by_id`,
  `ALTER TABLE payouts ADD CONSTRAINT fk_payouts_first_approver FOREIGN KEY (first_approved_by_id) REFERENCES users(id) ON DELETE SET NULL`,

  // payouts — mobile-money / bank disbursement destination columns. (Originally
  // filled in at a separate "checkout" step; now captured with the request. The
  // status enum below stays 5-value — a live DB that still carries the retired
  // AWAITING_CHECKOUT value keeps it, harmless, since the guard skips the MODIFY
  // once every listed value is already present.)
  `ALTER TABLE payouts MODIFY COLUMN status ENUM('REQUESTED','REVIEWED','APPROVED','PAID','REJECTED') NOT NULL DEFAULT 'REQUESTED'`,
  `ALTER TABLE payouts ADD COLUMN disbursement_method ENUM('MOBILE_MONEY','BANK') NULL AFTER notes`,
  `ALTER TABLE payouts ADD COLUMN disbursement_provider VARCHAR(40) NULL AFTER disbursement_method`,
  `ALTER TABLE payouts ADD COLUMN disbursement_account_name VARCHAR(120) NULL AFTER disbursement_provider`,
  `ALTER TABLE payouts ADD COLUMN disbursement_account_number VARCHAR(40) NULL AFTER disbursement_account_name`,
  `ALTER TABLE payouts ADD COLUMN disbursement_phone VARCHAR(20) NULL AFTER disbursement_account_number`,
  `ALTER TABLE payouts ADD COLUMN disbursement_bank_name VARCHAR(120) NULL AFTER disbursement_phone`,
  `ALTER TABLE payouts ADD COLUMN disbursement_branch VARCHAR(120) NULL AFTER disbursement_bank_name`,
  `ALTER TABLE payouts ADD COLUMN disbursement_submitted_at DATETIME NULL AFTER disbursement_branch`,
  `ALTER TABLE payouts ADD COLUMN disbursement_submitted_by_id BIGINT UNSIGNED NULL AFTER disbursement_submitted_at`,
  `ALTER TABLE payouts ADD CONSTRAINT fk_payouts_checkout_by FOREIGN KEY (disbursement_submitted_by_id) REFERENCES users(id) ON DELETE SET NULL`,

  // payouts — manager-confirmed atomic release. The payout destination
  // (mobile money only) is now captured with the request itself, so there is no
  // separate "checkout" step: after both approvals the payout sits in APPROVED
  // ("on hold") until the requesting CAMPAIGN_MANAGER confirms the release,
  // which fires the ClickPesa transfer and moves it straight to PAID. Any row
  // left in the retired AWAITING_CHECKOUT state becomes APPROVED (converges to
  // zero rows after the first run; the enum value itself is left in place on
  // live DBs — harmless — and dropped from database.sql for fresh installs).
  `UPDATE payouts SET status = 'APPROVED' WHERE status = 'AWAITING_CHECKOUT'`,
  `ALTER TABLE payouts ADD COLUMN confirmed_by_id BIGINT UNSIGNED NULL AFTER disbursement_submitted_by_id`,
  `ALTER TABLE payouts ADD COLUMN confirmed_at DATETIME NULL AFTER confirmed_by_id`,
  `ALTER TABLE payouts ADD CONSTRAINT fk_payouts_confirmed_by FOREIGN KEY (confirmed_by_id) REFERENCES users(id) ON DELETE SET NULL`,

  // payout_images — optional "proof of use" photos a CAMPAIGN_MANAGER attaches
  // to a payout request (invoices, receipts, site photos) so the reviewer and
  // org admin can see why the money is needed. Up to 5 per request.
  `CREATE TABLE IF NOT EXISTS payout_images (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payout_id   BIGINT UNSIGNED NOT NULL,
    image_path  VARCHAR(500) NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pi_payout FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE,
    INDEX idx_pi_payout (payout_id, sort_order)
  ) ENGINE=InnoDB`,

  // users — force a password change on first login for admin-created accounts
  // (createUser / resendInvite set this to 1; changePassword clears it).
  `ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER status`,

  // organizations — per-org default campaign service fee (%), editable by
  // ORG_ADMIN/SUPER_ADMIN; falls back to DEFAULT_SERVICE_FEE_PERCENT when a
  // campaign doesn't set its own service_fee_percent.
  `ALTER TABLE organizations ADD COLUMN default_service_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00 AFTER currency`,

  // users — add the REVIEWER role. Idempotent: skipped once the enum lists it.
  `ALTER TABLE users MODIFY COLUMN role ENUM('SUPER_ADMIN','ORG_ADMIN','REVIEWER','CAMPAIGN_MANAGER') NOT NULL DEFAULT 'CAMPAIGN_MANAGER'`,

  // REVIEWER is a platform-level role (vets campaigns for every org, like
  // SUPER_ADMIN) — detach any reviewer that an earlier build scoped to an org.
  // Bounded by IS NOT NULL, so a no-op after the first run.
  `UPDATE users SET organization_id = NULL WHERE role = 'REVIEWER' AND organization_id IS NOT NULL`,

  // ORG_ADMIN is now also platform-level: it gives the final (stage-2) approval
  // on campaigns and payouts across EVERY organisation, not one. Detach any
  // org-admin an earlier build scoped to a single org. Idempotent.
  `UPDATE users SET organization_id = NULL WHERE role = 'ORG_ADMIN' AND organization_id IS NOT NULL`,

  // campaigns — custom service-fee proposal/approval flow. A manager's proposed
  // rate is parked in proposed_service_fee_percent (fee_status='PENDING') until
  // a reviewer/admin approves it; only then does it move into service_fee_percent.
  `ALTER TABLE campaigns ADD COLUMN proposed_service_fee_percent DECIMAL(5,2) NULL AFTER public_target`,
  `ALTER TABLE campaigns ADD COLUMN fee_status ENUM('NONE','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NONE' AFTER proposed_service_fee_percent`,
  `ALTER TABLE campaigns ADD COLUMN fee_reviewed_by BIGINT UNSIGNED NULL AFTER fee_status`,
  `ALTER TABLE campaigns ADD COLUMN fee_reviewed_at DATETIME NULL AFTER fee_reviewed_by`,
  `ALTER TABLE campaigns ADD COLUMN fee_review_notes TEXT NULL AFTER fee_reviewed_at`,
  `ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_fee_reviewed_by FOREIGN KEY (fee_reviewed_by) REFERENCES users(id) ON DELETE SET NULL`,

  // campaigns — two-stage approval. A manager's campaign now needs a second,
  // independent approval (REVIEWED -> ACTIVE) on top of the first
  // (PENDING -> REVIEWED); first_approved_by/at track who gave the first one
  // so the service layer can require a *different* person for the second.
  `ALTER TABLE campaigns MODIFY COLUMN status ENUM('DRAFT','PENDING','REVIEWED','ACTIVE','PAUSED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT'`,
  `ALTER TABLE campaigns ADD COLUMN first_approved_by BIGINT UNSIGNED NULL AFTER featured_at`,
  `ALTER TABLE campaigns ADD COLUMN first_approved_at DATETIME NULL AFTER first_approved_by`,
  `ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_first_approved_by FOREIGN KEY (first_approved_by) REFERENCES users(id) ON DELETE SET NULL`,

  // campaigns — a hard "reject" is now recoverable: the campaign moves to
  // REJECTED (not the terminal CANCELLED) and the manager can fix + resubmit it
  // straight back to PENDING (see submitCampaign / rejectCampaign).
  `ALTER TABLE campaigns MODIFY COLUMN status ENUM('DRAFT','PENDING','REVIEWED','ACTIVE','PAUSED','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'DRAFT'`,

  // payment_attempts — donor_email/provider/campaign_donor_target_id are in
  // database.sql but were missing here, so any DB older than that addition
  // 500s on every public/push contribution ("Unknown column 'donor_email'").
  `ALTER TABLE payment_attempts ADD COLUMN donor_email VARCHAR(255) NULL AFTER donor_name`,
  `ALTER TABLE payment_attempts ADD COLUMN provider VARCHAR(64) NULL AFTER gateway_ref`,
  `ALTER TABLE payment_attempts ADD COLUMN campaign_donor_target_id BIGINT UNSIGNED NULL AFTER donor_email`,
  `ALTER TABLE payment_attempts ADD CONSTRAINT fk_pa_cdt FOREIGN KEY (campaign_donor_target_id) REFERENCES campaign_donor_targets(id) ON DELETE SET NULL`,
  `ALTER TABLE payment_attempts ADD INDEX idx_pa_cdt (campaign_donor_target_id)`,

  // donations — donor_email is in database.sql but was missing here too
  // (receipt emails silently had nowhere to read the address from).
  `ALTER TABLE donations ADD COLUMN donor_email VARCHAR(255) NULL AFTER donor_phone`,

  // campaign_donor_targets — actual_amount/payment_status are what the whole
  // "who has/hasn't paid their pledge" board and payment-confirmation update
  // depend on (see donation/service.js); missing here on an older DB meant
  // every payment silently failed to move a donor out of UNPAID.
  `ALTER TABLE campaign_donor_targets ADD COLUMN actual_amount DECIMAL(14,0) NULL DEFAULT 0 AFTER expected_amount`,
  `ALTER TABLE campaign_donor_targets ADD COLUMN payment_status ENUM('UNPAID','PARTIAL','PAID_FULL') NOT NULL DEFAULT 'UNPAID' AFTER actual_amount`,

  // campaigns — strict ordered approval + edit-re-approval + reviewer feedback.
  // created_by_id: keeps an approver from approving a campaign they created.
  // review_notes/review_state: last reject / "request changes" feedback shown
  // to the manager. has_pending_changes: denormalised flag for list badges
  // (source of truth is campaign_change_requests below).
  `ALTER TABLE campaigns ADD COLUMN created_by_id BIGINT UNSIGNED NULL AFTER organization_id`,
  `ALTER TABLE campaigns ADD COLUMN review_notes TEXT NULL AFTER approved_at`,
  `ALTER TABLE campaigns ADD COLUMN review_state ENUM('NONE','CHANGES_REQUESTED') NOT NULL DEFAULT 'NONE' AFTER review_notes`,
  `ALTER TABLE campaigns ADD COLUMN has_pending_changes TINYINT(1) NOT NULL DEFAULT 0 AFTER review_state`,
  `ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL`,
  // Best-effort backfill of created_by_id for existing campaigns from the
  // earliest assignment (bounded by IS NULL, so it's a no-op after the first run).
  `UPDATE campaigns c
     LEFT JOIN (
       SELECT campaign_id, MIN(user_id) AS user_id
       FROM campaign_assignments GROUP BY campaign_id
     ) a ON a.campaign_id = c.id
   SET c.created_by_id = a.user_id
   WHERE c.created_by_id IS NULL AND a.user_id IS NOT NULL`,

  // campaign_change_requests — parked material edits to a live campaign that
  // must clear the two-stage chain before being written onto the campaign.
  `CREATE TABLE IF NOT EXISTS campaign_change_requests (
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
  ) ENGINE=InnoDB`,

  // campaign_closure_requests — two-stage approval chain (mirrors payouts /
  // campaign change requests): a manager's request to close a campaign now
  // needs a REVIEWER's first review (PENDING -> REVIEWED) before an ORG_ADMIN
  // gives the final approval (REVIEWED -> APPROVED, campaign -> COMPLETED).
  // first_approved_by_id/at track the stage-1 sign-off so stage 2 must be a
  // different person.
  `ALTER TABLE campaign_closure_requests MODIFY COLUMN status ENUM('PENDING','REVIEWED','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING'`,
  `ALTER TABLE campaign_closure_requests ADD COLUMN first_approved_by_id BIGINT UNSIGNED NULL AFTER requested_by_id`,
  `ALTER TABLE campaign_closure_requests ADD COLUMN first_approved_at DATETIME NULL AFTER first_approved_by_id`,
  `ALTER TABLE campaign_closure_requests ADD CONSTRAINT fk_ccreq_first_approver FOREIGN KEY (first_approved_by_id) REFERENCES users(id) ON DELETE SET NULL`,

  // campaign_completion_reports — same two-stage approval chain: a REVIEWER's
  // first review (PENDING_REVIEW -> REVIEWED) before an ORG_ADMIN gives the
  // final approval (REVIEWED -> APPROVED). first_reviewed_by_id/at track the
  // stage-1 sign-off so stage 2 must be a different person.
  `ALTER TABLE campaign_completion_reports MODIFY COLUMN status ENUM('PENDING_REVIEW','REVIEWED','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW'`,
  `ALTER TABLE campaign_completion_reports ADD COLUMN first_reviewed_by_id BIGINT UNSIGNED NULL AFTER submitted_by_id`,
  `ALTER TABLE campaign_completion_reports ADD COLUMN first_reviewed_at DATETIME NULL AFTER first_reviewed_by_id`,
  `ALTER TABLE campaign_completion_reports ADD CONSTRAINT fk_ccr_first_reviewer FOREIGN KEY (first_reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL`,

  // campaign_change_requests — also carries manager-initiated PAUSE / RESUME
  // ("suspend" / "resume") requests, which clear the very same two-stage chain
  // (REVIEWER then ORG_ADMIN) before the campaign's status actually changes.
  // request_kind='EDIT' is the original parked-edit behaviour; 'STATUS' rows
  // set status_action and keep the reason (if any) in payload.
  `ALTER TABLE campaign_change_requests ADD COLUMN request_kind ENUM('EDIT','STATUS') NOT NULL DEFAULT 'EDIT' AFTER organization_id`,
  `ALTER TABLE campaign_change_requests ADD COLUMN status_action ENUM('PAUSE','RESUME') NULL AFTER request_kind`,

  // campaign_images — a gallery photo added to / removed from a LIVE campaign is
  // now staged for the same two-stage review as a cover change instead of
  // showing publicly right away. 'ADD' = uploaded, not yet public; 'REMOVE' =
  // still public but dropped once the campaign's change request clears.
  `ALTER TABLE campaign_images ADD COLUMN pending_change ENUM('NONE','ADD','REMOVE') NOT NULL DEFAULT 'NONE' AFTER sort_order`,

  // notifications — per-user in-app staff notification centre.
  `CREATE TABLE IF NOT EXISTS notifications (
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
  ) ENGINE=InnoDB`,

  // campaign_gifts — in-kind ("gift") contributions to a campaign, each with an
  // estimated TZS value so non-monetary support shows up in the campaign
  // payment breakdown alongside cash. Optionally attributed to a known donor.
  `CREATE TABLE IF NOT EXISTS campaign_gifts (
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
  ) ENGINE=InnoDB`,

  // campaign_gifts — public gift pledges. A visitor on the campaign page can now
  // pledge an in-kind item (source = 'PUBLIC', status = 'PLEDGED') and say how it
  // changes hands — the team picks it up (delivery_method 'PICKUP' + address) or
  // the donor delivers it ('DROP_OFF'). Staff-recorded rows keep the column
  // defaults (source 'STAFF', status 'RECEIVED') so their behaviour is unchanged.
  `ALTER TABLE campaign_gifts ADD COLUMN source          ENUM('STAFF','PUBLIC') NOT NULL DEFAULT 'STAFF' AFTER recorded_by_id`,
  `ALTER TABLE campaign_gifts ADD COLUMN status          ENUM('PLEDGED','SCHEDULED','RECEIVED','CANCELLED') NOT NULL DEFAULT 'RECEIVED' AFTER source`,
  `ALTER TABLE campaign_gifts ADD COLUMN delivery_method ENUM('PICKUP','DROP_OFF') NULL AFTER status`,
  `ALTER TABLE campaign_gifts ADD COLUMN donor_name      VARCHAR(150) NULL AFTER delivery_method`,
  `ALTER TABLE campaign_gifts ADD COLUMN donor_phone     VARCHAR(32)  NULL AFTER donor_name`,
  `ALTER TABLE campaign_gifts ADD COLUMN donor_email     VARCHAR(255) NULL AFTER donor_phone`,
  `ALTER TABLE campaign_gifts ADD COLUMN pickup_address  VARCHAR(400) NULL AFTER donor_email`,
  `ALTER TABLE campaign_gifts ADD COLUMN preferred_date  DATE NULL AFTER pickup_address`,
  `ALTER TABLE campaign_gifts ADD COLUMN note            VARCHAR(600) NULL AFTER preferred_date`,

  // password_reset_tokens — "forgot password" flow. Only the SHA-256 hash of
  // the token is stored; the raw token is in the emailed link. Single-use
  // (used_at) and short-lived (expires_at, ~1h).
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL,
    token_hash      CHAR(64) NOT NULL,
    expires_at      DATETIME NOT NULL,
    used_at         DATETIME NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_prt_token (token_hash),
    INDEX idx_prt_user (user_id)
  ) ENGINE=InnoDB`,

  // organization_settings — org-wide preferences edited on the dashboard
  // Settings page (registration no., default channel, localisation, email
  // notification toggles). One row per org, created on first save.
  `CREATE TABLE IF NOT EXISTS organization_settings (
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
  ) ENGINE=InnoDB`,

  // campaign_testimonials — the "What Campaign Owners Say" quote cards on the
  // public /campaigns page. Platform content, edited only by SUPER_ADMIN from
  // the dashboard Settings › Testimonials tab. quote_sw / role_sw are
  // machine-translated on save; /sw/campaigns falls back to English when blank.
  `CREATE TABLE IF NOT EXISTS campaign_testimonials (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quote         TEXT NOT NULL,
    author        VARCHAR(150) NOT NULL,
    role          VARCHAR(200) NOT NULL,
    quote_sw      TEXT NULL,
    role_sw       VARCHAR(200) NULL,
    photo_url     VARCHAR(500) NULL,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    sort_order    INT NOT NULL DEFAULT 0,
    created_by_id BIGINT UNSIGNED NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_testimonial_creator FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_testimonial_active (is_active, sort_order, id)
  ) ENGINE=InnoDB`,
];

async function columnExists(table, column) {
  const rows = await db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function indexExists(table, indexName) {
  const rows = await db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return rows[0].cnt > 0;
}

/** Full column type string, e.g. "enum('A','B')" — used to guard ENUM widenings. */
async function columnType(table, column) {
  const rows = await db.query(
    `SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0] ? rows[0].t : null;
}

async function runMigrations() {
  let applied = 0;
  for (const sql of MIGRATIONS) {
    try {
      const addColMatch = sql.match(
        /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i
      );
      const addIdxMatch = sql.match(
        /ALTER\s+TABLE\s+(\w+)\s+ADD\s+(?:UNIQUE\s+)?INDEX\s+(\w+)/i
      );
      const modifyEnumMatch = sql.match(
        /ALTER\s+TABLE\s+(\w+)\s+MODIFY\s+COLUMN\s+(\w+)\s+ENUM/i
      );

      if (addColMatch) {
        const [, table, col] = addColMatch;
        if (await columnExists(table, col)) continue;
      } else if (addIdxMatch) {
        const [, table, idx] = addIdxMatch;
        if (await indexExists(table, idx)) continue;
      } else if (modifyEnumMatch) {
        // Skip the ENUM widening once every value it names is already present,
        // so this doesn't re-run an ALTER on every startup.
        const [, table, col] = modifyEnumMatch;
        const current = await columnType(table, col);
        const wanted = sql.match(/'[^']+'/g) || [];
        if (current && wanted.every((v) => current.includes(v))) continue;
      }

      await db.execute(sql);
      applied++;
    } catch (err) {
      // 1060=Duplicate column, 1061=Duplicate key name, 1051=Unknown table,
      // 1091=Can't drop, 1826=Duplicate foreign key constraint name,
      // 121=duplicate constraint name (some MySQL builds report ADD CONSTRAINT
      // re-runs this way), 1050=table already exists (CREATE TABLE IF NOT EXISTS
      // still surfaces it on some builds)
      // 1005 = Can't create table (mysql2 wraps a duplicate-FK "errno: 121" this way)
      if ([1060, 1061, 1051, 1091, 1826, 121, 1050, 1005].includes(err.errno)) continue;
      console.warn(`⚠️  Migration warning: ${err.message}`);
    }
  }
  if (applied > 0) {
    console.log(`🔄 Auto-migration: ${applied} column(s) added`);
  }

  await seedReviewers();
  await seedTestimonials();
}

/**
 * Seed the three original "What Campaign Owners Say" cards the /campaigns page
 * used to hard-code, so an existing DB doesn't render an empty section the
 * moment this feature ships. Runs once — only while the table is empty.
 */
async function seedTestimonials() {
  try {
    const rows = await db.query("SELECT COUNT(*) AS cnt FROM campaign_testimonials");
    if (rows[0].cnt > 0) return;
    await db.execute(
      `INSERT INTO campaign_testimonials (quote, author, role, sort_order) VALUES
        (?, ?, ?, 0), (?, ?, ?, 1), (?, ?, ?, 2)`,
      [
        "As our launch partner, we could set up a secure dashboard, manage users by role, and keep an audit-ready donor pool from day one. Changia gave us the foundation we needed to run campaigns people can trust.",
        "Dr. Msuya",
        "Organization Administrator | Initial Launch Partner",
        "With a shareable campaign link, we turn radio and WhatsApp listeners into donors. A short link, a QR code and a mobile-first campaign page — from TZS 100 — and every verified contribution updates the progress bar.",
        "Amadi Kimaro",
        "Campaign Manager | Community Health Fund",
        "Self-serve contributions are the innovation we've been waiting for. A supporter picks an amount, confirms with their own PIN at the operator prompt, and our totals update the moment the gateway verifies it.",
        "Neema Mushi",
        "Field Fundraising Lead",
      ]
    );
    console.log("🌱 Seeded 3 default campaign testimonials");
  } catch (err) {
    console.warn(`⚠️  Testimonial seed warning: ${err.message}`);
  }
}

/**
 * Two-stage campaign approval requires two DIFFERENT approvers. Older/live
 * copies of the DB may have zero or one REVIEWER seeded, which would leave
 * campaigns permanently stuck in REVIEWED. Top up to two, once. Reviewers are
 * platform-level (organization_id NULL) — they vet campaigns for every org.
 */
async function seedReviewers() {
  const REVIEWERS = [
    ["Zainab", "Kileo", "reviewer@msuya-foundation.org.tz", "255713000003"],
    ["Elias", "Mrema", "reviewer2@msuya-foundation.org.tz", "255713000004"],
  ];
  try {
    for (const [firstName, lastName, email, phone] of REVIEWERS) {
      const existing = await db.query("SELECT id FROM users WHERE email = ?", [email]);
      if (existing.length > 0) continue;

      await db.execute(
        `INSERT INTO users (organization_id, first_name, last_name, email, phone, password_hash, role, status)
         VALUES (NULL, ?, ?, ?, ?,
                 '$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW', 'REVIEWER', 'ACTIVE')`,
        [firstName, lastName, email, phone]
      );
      console.log(`🔄 Auto-migration: seeded demo reviewer (${email})`);
    }
  } catch (err) {
    console.warn(`⚠️  Second-reviewer seed warning: ${err.message}`);
  }
}

module.exports = { runMigrations };
