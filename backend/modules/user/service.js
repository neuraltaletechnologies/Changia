const { randomBytes } = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { normalizePhone } = require("../../utils/phone");

const TEMP_PASSWORD_PREFIX = "Changia-";

/** Generates a cryptographically random temporary password for invited members. */
function generateTemporaryPassword() {
  const random = randomBytes(6).toString("base64url");
  return `${TEMP_PASSWORD_PREFIX}${random}`;
}

function serializeUser(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    avatarUrl: row.avatar_url,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    organizationId: row.organization_id,
  };
}

async function listUsers(organizationId, filters) {
  const where = ["organization_id = ?"];
  const values = [organizationId];

  if (filters.search) {
    where.push(
      "(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)"
    );
    const like = `%${filters.search}%`;
    values.push(like, like, like);
  }
  if (filters.role) {
    where.push("role = ?");
    values.push(filters.role);
  }
  if (filters.status) {
    where.push("status = ?");
    values.push(filters.status);
  }

  const whereSql = where.join(" AND ");
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;

  const users = await db.query(
    `SELECT id, first_name, last_name, email, phone, role, status, avatar_url,
            last_login_at, created_at, organization_id
     FROM users WHERE ${whereSql}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM users WHERE ${whereSql}`, values)
    .then((rows) => [rows]);

  const total = countRow.total;
  return {
    users: users.map(serializeUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Creates a team member with a temporary password (returned to the inviter).
 */
async function createUser(organizationId, data) {
  const existing = await db.query("SELECT id FROM users WHERE email = ?", [data.email]);
  if (existing.length > 0) {
    throw ApiError.conflict("A user with this email already exists");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const result = await db.execute(
    `INSERT INTO users (organization_id, first_name, last_name, email, phone, password_hash, role, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      organizationId,
      data.firstName,
      data.lastName || null,
      data.email,
      data.phone ? normalizePhone(data.phone) : null,
      passwordHash,
      data.role,
    ]
  );

  const users = await db.query(
    `SELECT id, first_name, last_name, email, phone, role, status, avatar_url,
            last_login_at, created_at, organization_id
     FROM users WHERE id = ?`,
    [result.insertId]
  );

  return { user: serializeUser(users[0]), temporaryPassword };
}

async function updateUser(organizationId, userId, data) {
  const existing = await db.query(
    "SELECT id FROM users WHERE id = ? AND organization_id = ?",
    [userId, organizationId]
  );
  if (existing.length === 0) throw ApiError.notFound("Team member not found");

  const fields = [];
  const values = [];
  if (data.firstName !== undefined) { fields.push("first_name = ?"); values.push(data.firstName); }
  if (data.lastName !== undefined) { fields.push("last_name = ?"); values.push(data.lastName); }
  if (data.phone !== undefined) { fields.push("phone = ?"); values.push(normalizePhone(data.phone)); }
  if (data.role !== undefined) { fields.push("role = ?"); values.push(data.role); }
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }

  if (fields.length > 0) {
    values.push(userId);
    await db.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  const users = await db.query(
    `SELECT id, first_name, last_name, email, phone, role, status, avatar_url,
            last_login_at, created_at, organization_id
     FROM users WHERE id = ?`,
    [userId]
  );
  return serializeUser(users[0]);
}

async function deleteUser(organizationId, userId, actorId) {
  if (Number(userId) === Number(actorId)) {
    throw ApiError.badRequest("You cannot remove your own account");
  }
  const existing = await db.query(
    "SELECT role FROM users WHERE id = ? AND organization_id = ?",
    [userId, organizationId]
  );
  if (existing.length === 0) throw ApiError.notFound("Team member not found");

  if (existing[0].role === "ORG_ADMIN") {
    const [[countRow]] = await db
      .query(
        `SELECT COUNT(*) AS total FROM users
         WHERE organization_id = ? AND role = 'ORG_ADMIN' AND status = 'ACTIVE'`,
        [organizationId]
      )
      .then((rows) => [rows]);
    if (countRow.total <= 1) {
      throw ApiError.badRequest(
        "The organization must keep at least one active administrator"
      );
    }
  }

  await db.execute("DELETE FROM users WHERE id = ?", [userId]);
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  generateTemporaryPassword,
};
