const db = require("../../db");

async function listAuditLogs(organizationId, filters) {
  const where = ["organization_id = ?"];
  const values = [organizationId];

  if (filters.action) {
    where.push("action LIKE ?");
    values.push(`%${filters.action}%`);
  }
  if (filters.severity) {
    where.push("severity = ?");
    values.push(filters.severity);
  }
  if (filters.search) {
    where.push("(actor_email LIKE ? OR resource LIKE ?)");
    const like = `%${filters.search}%`;
    values.push(like, like);
  }

  const whereSql = where.join(" AND ");
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;

  const logs = await db.query(
    `SELECT al.*, u.first_name, u.last_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     WHERE ${whereSql}
     ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM audit_logs WHERE ${whereSql}`, values)
    .then((rows) => [rows]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      resource: l.resource,
      resourceId: l.resource_id,
      actorEmail: l.actor_email,
      actor: l.actor_id
        ? { id: l.actor_id, firstName: l.first_name, lastName: l.last_name, email: l.actor_email }
        : null,
      severity: l.severity,
      details: l.details,
      createdAt: l.created_at,
    })),
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
}

async function recentActivity(organizationId, limit = 10) {
  const logs = await db.query(
    `SELECT al.*, u.first_name, u.last_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     WHERE al.organization_id = ?
     ORDER BY al.created_at DESC LIMIT ?`,
    [organizationId, limit]
  );
  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    resource: l.resource,
    resourceId: l.resource_id,
    actorEmail: l.actor_email,
    actor: l.actor_id
      ? { id: l.actor_id, firstName: l.first_name, lastName: l.last_name, email: l.actor_email }
      : null,
    severity: l.severity,
    createdAt: l.created_at,
  }));
}

module.exports = { listAuditLogs, recentActivity };
