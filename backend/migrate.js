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

      if (addColMatch) {
        const [, table, col] = addColMatch;
        if (await columnExists(table, col)) continue;
      } else if (addIdxMatch) {
        const [, table, idx] = addIdxMatch;
        if (await indexExists(table, idx)) continue;
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
