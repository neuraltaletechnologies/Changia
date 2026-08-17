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

/** Columns shared by every user listing/read so the UI always has same shape. */
const USER_SELECT = `
  SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.status,
         u.avatar_url, u.last_login_at, u.created_at, u.organization_id,
         o.name AS organization_name
  FROM users u
  LEFT JOIN organizations o ON o.id = u.organization_id
`;

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
    organizationName: row.organization_name || null,
  };
}

/**
 * Scope rules:
 *   - SUPER_ADMIN can read/manage every user (optional org filter).
 *   - ORG_ADMIN can only read/manage users inside their own organization.
 */
function assertCanManageUser(caller, target) {
  if (caller.role === "SUPER_ADMIN") return;
  if (
    Number(caller.organizationId) &&
    Number(target.organization_id) === Number(caller.organizationId)
  ) {
    return;
  }
  throw ApiError.notFound("User member not found");
}

/** Resolves the organization scope of a listing for the current caller. */
function resolveOrgScope(caller, organizationId) {
  if (caller.role === "SUPER_ADMIN") {
    return organizationId ? ["u.organization_id = ?", [Number(organizationId)]] : [null, []];
  }
  return ["u.organization_id = ?", [caller.organizationId]];
}

async function listUsers(caller, filters) {
  const where = [];
  const values = [];

  const [orgWhere, orgValues] = resolveOrgScope(caller, filters.organizationId);
  if (orgWhere) {
    where.push(orgWhere);
    values.push(...orgValues);
  }

  if (filters.search) {
    where.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)");
    const like = `%${filters.search}%`;
    values.push(like, like, like, like);
  }
  if (filters.role) {
    where.push("u.role = ?");
    values.push(filters.role);
  }
  if (filters.status) {
    where.push("u.status = ?");
    values.push(filters.status);
  }

  const sortColumn = {
    name: "u.first_name",
    email: "u.email",
    role: "u.role",
    status: "u.status",
    created: "u.created_at",
    lastLogin: "u.last_login_at",
  }[filters.sortBy || "created"];

  const sortDir = filters.sortDir === "asc" ? "ASC" : "DESC";

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;

  const users = await db.query(
    `${USER_SELECT} ${whereSql} ORDER BY ${sortColumn} ${sortDir} LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const countWhere = whereSql.replace(/u\./g, "");
  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM users ${countWhere ? `WHERE ${countWhere}` : ""}`, values)
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

async function assertRoleAssignable(caller, role) {
  if (role === "SUPER_ADMIN" && caller.role !== "SUPER_ADMIN") {
    throw ApiError.forbidden("Only a super admin can assign the super admin role");
  }
}

/**
 * Creates a user member with a temporary password (returned to the inviter).
 */
async function createUser(caller, data) {
  const existing = await db.query("SELECT id FROM users WHERE email = ?", [data.email]);
  if (existing.length > 0) {
    throw ApiError.conflict("A user with this email already exists");
  }

  await assertRoleAssignable(caller, data.role);

  const organizationId =
    caller.role === "SUPER_ADMIN"
      ? data.organizationId
        ? Number(data.organizationId)
        : null
      : caller.organizationId;

  if (organizationId !== null) {
    const orgs = await db.query("SELECT id FROM organizations WHERE id = ?", [organizationId]);
    if (orgs.length === 0) throw ApiError.notFound("Organization not found");
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

  const users = await db.query(`${USER_SELECT} WHERE u.id = ?`, [result.insertId]);

  return { user: serializeUser(users[0]), temporaryPassword };
}

/** Guards that an organization keeps at least one active administrator. */
async function assertLastOrgAdmin(organizationId) {
  if (!organizationId) return;
  const [[countRow]] = await db
    .query(
      `SELECT COUNT(*) AS total FROM users
       WHERE organization_id = ? AND role = 'ORG_ADMIN' AND status = 'ACTIVE'`,
      [organizationId]
    )
    .then((rows) => [rows]);
  if (countRow.total <= 1) {
    throw ApiError.badRequest("The organization must keep at least one active administrator");
  }
}

async function updateUser(caller, userId, data) {
  const existing = await db.query(`${USER_SELECT} WHERE u.id = ?`, [userId]);
  const target = existing[0];
  if (!target) throw ApiError.notFound("User member not found");
  assertCanManageUser(caller, target);

  const isSelf = Number(userId) === Number(caller.id);
  if (isSelf && data.role !== undefined && data.role !== target.role) {
    throw ApiError.badRequest("You cannot change your own role");
  }
  if (isSelf && data.status !== undefined && data.status !== "ACTIVE") {
    throw ApiError.badRequest("You cannot deactivate your own account");
  }

  if (data.role !== undefined && data.role !== target.role) {
    await assertRoleAssignable(caller, data.role);
    if (target.role === "ORG_ADMIN") {
      await assertLastOrgAdmin(target.organization_id);
    }
  }
  if (data.status !== undefined && data.status !== "ACTIVE" && target.role === "ORG_ADMIN") {
    await assertLastOrgAdmin(target.organization_id);
  }

  const fields = [];
  const values = [];
  if (data.firstName !== undefined) { fields.push("first_name = ?"); values.push(data.firstName); }
  if (data.lastName !== undefined) { fields.push("last_name = ?"); values.push(data.lastName); }
  if (data.phone !== undefined) {
    fields.push("phone = ?");
    values.push(data.phone ? normalizePhone(data.phone) : null);
  }
  if (data.role !== undefined) { fields.push("role = ?"); values.push(data.role); }
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }

  if (fields.length > 0) {
    values.push(userId);
    await db.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  const users = await db.query(`${USER_SELECT} WHERE u.id = ?`, [userId]);
  return serializeUser(users[0]);
}

async function deleteUser(caller, userId) {
  if (Number(userId) === Number(caller.id)) {
    throw ApiError.badRequest("You cannot remove your own account");
  }
  const existing = await db.query(`${USER_SELECT} WHERE u.id = ?`, [userId]);
  const target = existing[0];
  if (!target) throw ApiError.notFound("User member not found");
  assertCanManageUser(caller, target);

  if (target.role === "ORG_ADMIN") {
    await assertLastOrgAdmin(target.organization_id);
  }

  await db.execute("DELETE FROM users WHERE id = ?", [userId]);
  return serializeUser(target);
}

async function resendInvite(caller, userId) {
  const existing = await db.query(`${USER_SELECT} WHERE u.id = ?`, [userId]);
  const target = existing[0];
  if (!target) throw ApiError.notFound("User member not found");
  assertCanManageUser(caller, target);
  const temporaryPassword = generateTemporaryPassword();
  await db.execute("UPDATE users SET password_hash = ?, status = 'PENDING' WHERE id = ?", [
    await bcrypt.hash(temporaryPassword, 12), userId,
  ]);
  const updated = await db.query(`${USER_SELECT} WHERE u.id = ?`, [userId]);
  return { user: serializeUser(updated[0]), temporaryPassword };
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resendInvite,
  generateTemporaryPassword,
};
