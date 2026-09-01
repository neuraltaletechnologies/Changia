/**
 * One-shot schema + demo-data import for a managed MySQL (Aiven, TiDB Cloud, …).
 *
 * Windows / no local `mysql` client friendly — uses the mysql2 driver that the
 * API already depends on, so it speaks MySQL 8's caching_sha2_password and TLS.
 *
 * Usage (from Backend/):
 *   node scripts/import-db.js --uri "mysql://avnadmin:PASS@host:21529/defaultdb?ssl-mode=REQUIRED"
 *   # or set DATABASE_URL, or the individual DB_HOST/DB_PORT/DB_USER/DB_PASSWORD vars
 *
 * It runs Backend/database.sql verbatim; that file does
 * `CREATE DATABASE IF NOT EXISTS changia; USE changia;` so afterwards the data
 * lives in a `changia` database on the server (set DB_NAME=changia on the API).
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--uri") out.uri = args[++i];
    if (args[i] === "--file") out.file = args[++i];
  }
  return out;
}

function connectionConfig() {
  const { uri } = parseArgs();
  const raw = uri || process.env.DATABASE_URL || process.env.DB_URI;
  if (raw) {
    const u = new URL(raw);
    return {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      // connect without selecting a db — database.sql creates + USEs its own
      database: undefined,
    };
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: undefined,
  };
}

async function main() {
  const { file } = parseArgs();
  const sqlPath = file
    ? path.resolve(file)
    : path.join(__dirname, "..", "database.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const cfg = connectionConfig();
  if (!cfg.host || !cfg.user) {
    console.error(
      "Missing connection details. Pass --uri \"mysql://user:pass@host:port/db\" " +
        "or set DATABASE_URL (or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD)."
    );
    process.exit(1);
  }

  console.log(`Connecting to ${cfg.host}:${cfg.port} as ${cfg.user} …`);
  const conn = await mysql.createConnection({
    ...cfg,
    multipleStatements: true,
    ssl: { rejectUnauthorized: false, minVersion: "TLSv1.2" },
  });

  console.log(`Running ${path.basename(sqlPath)} (${(sql.length / 1024).toFixed(0)} KB) …`);
  await conn.query(sql);

  const [rows] = await conn.query("SELECT COUNT(*) AS users FROM changia.users");
  console.log(`✅ Import complete — changia.users has ${rows[0].users} row(s).`);
  console.log("   Set DB_NAME=changia and DB_SSL=true on the API.");
  await conn.end();
}

main().catch((err) => {
  console.error("❌ Import failed:", err.message);
  process.exit(1);
});
