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

  // organizations — per-org default campaign service fee (%), editable by
  // ORG_ADMIN/SUPER_ADMIN; falls back to DEFAULT_SERVICE_FEE_PERCENT when a
  // campaign doesn't set its own service_fee_percent.
  `ALTER TABLE organizations ADD COLUMN default_service_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00 AFTER currency`,

  // users — add the REVIEWER role (org-scoped approver between ORG_ADMIN and
  // CAMPAIGN_MANAGER). Idempotent: skipped once the enum already lists it.
  `ALTER TABLE users MODIFY COLUMN role ENUM('SUPER_ADMIN','ORG_ADMIN','REVIEWER','CAMPAIGN_MANAGER') NOT NULL DEFAULT 'CAMPAIGN_MANAGER'`,

  // campaigns — custom service-fee proposal/approval flow. A manager's proposed
  // rate is parked in proposed_service_fee_percent (fee_status='PENDING') until
  // a reviewer/admin approves it; only then does it move into service_fee_percent.
  `ALTER TABLE campaigns ADD COLUMN proposed_service_fee_percent DECIMAL(5,2) NULL AFTER public_target`,
  `ALTER TABLE campaigns ADD COLUMN fee_status ENUM('NONE','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NONE' AFTER proposed_service_fee_percent`,
  `ALTER TABLE campaigns ADD COLUMN fee_reviewed_by BIGINT UNSIGNED NULL AFTER fee_status`,
  `ALTER TABLE campaigns ADD COLUMN fee_reviewed_at DATETIME NULL AFTER fee_reviewed_by`,
  `ALTER TABLE campaigns ADD COLUMN fee_review_notes TEXT NULL AFTER fee_reviewed_at`,
  `ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_fee_reviewed_by FOREIGN KEY (fee_reviewed_by) REFERENCES users(id) ON DELETE SET NULL`,
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
      // 1091=Can't drop, 1826=Duplicate foreign key constraint name
      if ([1060, 1061, 1051, 1091, 1826].includes(err.errno)) continue;
      console.warn(`⚠️  Migration warning: ${err.message}`);
    }
  }
  if (applied > 0) {
    console.log(`🔄 Auto-migration: ${applied} column(s) added`);
  }
}

module.exports = { runMigrations };
