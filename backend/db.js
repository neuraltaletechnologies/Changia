const fs = require("fs");
const mysql = require("mysql2/promise");
const { env } = require("./config");

// Managed MySQL hosts (Aiven, TiDB Cloud, PlanetScale, Railway, …) require TLS.
// Set DB_SSL=true to enable it. DB_SSL_CA is optional — a PEM string or a path
// to the provider's CA bundle for strict certificate verification; without it we
// still negotiate TLS but skip chain validation (fine for a demo, and the usual
// fix for "self-signed certificate in certificate chain" against Aiven/TiDB).
function buildSslOption() {
  if (!env.DB.ssl) return undefined;
  if (env.DB.sslCa) {
    const ca = env.DB.sslCa.includes("BEGIN CERTIFICATE")
      ? env.DB.sslCa
      : fs.readFileSync(env.DB.sslCa, "utf8");
    return { ca, minVersion: "TLSv1.2" };
  }
  return { rejectUnauthorized: false, minVersion: "TLSv1.2" };
}

const pool = mysql.createPool({
  host: env.DB.host,
  port: env.DB.port,
  user: env.DB.user,
  password: env.DB.password,
  database: env.DB.database,
  ssl: buildSslOption(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: false,
});

/**
 * Runs a query and returns rows.
 *   await query("SELECT * FROM users WHERE id = ?", [id])
 * For INSERT/UPDATE/DELETE use execute() instead.
 */
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Runs an INSERT/UPDATE/DELETE and returns the result object
 * ({ insertId, affectedRows, changedRows }).
 */
async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

/**
 * Runs a callback inside a transaction. Throw inside the callback to roll back.
 *   await withTransaction(async (tx) => {
 *     await tx.execute("INSERT ...");
 *     await tx.execute("UPDATE ...");
 *   });
 */
async function withTransaction(fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn({
      query: (sql, p = []) => connection.query(sql, p).then(([r]) => r),
      execute: (sql, p = []) => connection.execute(sql, p).then(([r]) => r),
    });
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function testConnection() {
  await pool.query("SELECT 1");
}

module.exports = { pool, query, execute, withTransaction, testConnection };
