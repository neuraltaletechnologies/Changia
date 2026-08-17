const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");

function isAdminRole(role) {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN";
}

function serialize(t) {
  return {
    id: t.id,
    name: t.name,
    channel: t.channel,
    subject: t.subject,
    body: t.body,
    createdBy: t.created_by_id,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

async function loadTemplate(organizationId, id) {
  const rows = await db.query(
    "SELECT * FROM message_templates WHERE id = ? AND organization_id = ?",
    [id, organizationId]
  );
  const template = rows[0];
  if (!template) throw ApiError.notFound("Message template not found");
  return template;
}

function assertAccess(user, template) {
  if (isAdminRole(user.role)) return;
  if (Number(template.created_by_id) === user.id) return;
  throw ApiError.forbidden("You can only manage your own templates", "TEMPLATE_ACCESS_DENIED");
}

async function listTemplates(organizationId, user, filters) {
  const where = ["organization_id = ?"];
  const values = [organizationId];

  if (!isAdminRole(user.role)) {
    where.push("created_by_id = ?");
    values.push(user.id);
  }
  if (filters.channel) {
    where.push("channel = ?");
    values.push(filters.channel);
  }
  if (filters.search) {
    where.push("name LIKE ?");
    values.push(`%${filters.search}%`);
  }

  const whereSql = where.join(" AND ");
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  const rows = await db.query(
    `SELECT * FROM message_templates WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM message_templates WHERE ${whereSql}`, values)
    .then((rows2) => [rows2]);

  return {
    templates: rows.map(serialize),
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
}

async function createTemplate(organizationId, user, data) {
  const result = await db.execute(
    `INSERT INTO message_templates (organization_id, created_by_id, name, channel, subject, body)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [organizationId, user.id, data.name.trim(), data.channel, data.subject || null, data.body]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'reminder_template.created', 'message_template', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(result.insertId)]
  );

  return serialize(await loadTemplate(organizationId, result.insertId));
}

async function updateTemplate(organizationId, user, id, data) {
  const template = await loadTemplate(organizationId, id);
  assertAccess(user, template);

  const fields = [];
  const values = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name.trim()); }
  if (data.channel !== undefined) { fields.push("channel = ?"); values.push(data.channel); }
  if (data.subject !== undefined) { fields.push("subject = ?"); values.push(data.subject || null); }
  if (data.body !== undefined) { fields.push("body = ?"); values.push(data.body); }

  if (fields.length > 0) {
    values.push(id);
    await db.execute(`UPDATE message_templates SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  return serialize(await loadTemplate(organizationId, id));
}

async function deleteTemplate(organizationId, user, id) {
  const template = await loadTemplate(organizationId, id);
  assertAccess(user, template);
  await db.execute("DELETE FROM message_templates WHERE id = ?", [id]);

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'reminder_template.deleted', 'message_template', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(id)]
  );
}

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate, loadTemplate, serialize };
