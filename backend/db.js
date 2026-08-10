const mysql = require("mysql2/promise");
const { env } = require("./config");

const pool = mysql.createPool({
  host: env.DB.host,
  port: env.DB.port,
  user: env.DB.user,
  password: env.DB.password,
  database: env.DB.database,
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
