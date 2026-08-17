const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");

function serialize(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    status: row.status,
    notes: row.notes,
    requestedBy: row.requested_by_id,
    approvedBy: row.approved_by_id,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
    gatewayRef: row.gateway_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listPayouts(organizationId, filters) {
  const where = ["organization_id = ?"];
  const values = [organizationId];
  if (filters.status) {
    where.push("status = ?");
    values.push(filters.status);
  }
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;
  const whereSql = where.join(" AND ");
  const payouts = await db.query(
    `SELECT * FROM payouts WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const count = await db.query(`SELECT COUNT(*) AS total FROM payouts WHERE ${whereSql}`, values);
  return {
    payouts: payouts.map(serialize),
    pagination: { page, limit, total: count[0].total, totalPages: Math.ceil(count[0].total / limit) },
  };
}

async function getPayout(organizationId, id) {
  const rows = await db.query("SELECT * FROM payouts WHERE id = ? AND organization_id = ?", [id, organizationId]);
  if (!rows[0]) throw ApiError.notFound("Payout not found");
  return serialize(rows[0]);
}

async function createPayout(organizationId, user, data) {
  const result = await db.execute(
    `INSERT INTO payouts (organization_id, amount, status, requested_by_id, notes)
     VALUES (?, ?, 'REQUESTED', ?, ?)`,
    [organizationId, data.amount, user.id, data.notes || null]
  );
  return getPayout(organizationId, result.insertId);
}

async function decidePayout(organizationId, user, id, approved, data = {}) {
  const payout = await getPayout(organizationId, id);
  if (payout.status !== "REQUESTED") {
    throw ApiError.conflict("Only requested payouts can be decided", "PAYOUT_ALREADY_DECIDED");
  }
  await db.execute(
    `UPDATE payouts SET status = ?, approved_by_id = ?, approved_at = NOW(), notes = COALESCE(?, notes)
     WHERE id = ? AND organization_id = ?`,
    [approved ? "APPROVED" : "REJECTED", user.id, data.notes || null, id, organizationId]
  );
  return getPayout(organizationId, id);
}

async function markPaid(organizationId, id, data) {
  const payout = await getPayout(organizationId, id);
  if (payout.status !== "APPROVED") {
    throw ApiError.badRequest("Only approved payouts can be marked paid", "PAYOUT_NOT_APPROVED");
  }
  await db.execute(
    "UPDATE payouts SET status = 'PAID', paid_at = NOW(), gateway_ref = ?, notes = COALESCE(?, notes) WHERE id = ? AND organization_id = ?",
    [data.gatewayRef || null, data.notes || null, id, organizationId]
  );
  return getPayout(organizationId, id);
}

module.exports = { listPayouts, getPayout, createPayout, decidePayout, markPaid };
