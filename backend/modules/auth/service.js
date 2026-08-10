const bcrypt = require("bcryptjs");
const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { normalizePhone } = require("../../utils/phone");
const { signAccessToken } = require("../../utils/token");

function slugify(name) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${Date.now().toString(36)}`;
}

function serializeUser(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatar_url,
    organizationId: user.organization_id,
  };
}

/**
 * Registers a new organization together with its first Administrator.
 * Both rows are created in one transaction — if either fails, nothing is saved.
 */
async function registerOrganization(data) {
  const existing = await db.query("SELECT id FROM users WHERE email = ?", [data.email]);
  if (existing.length > 0) {
    throw ApiError.conflict("An account with this email already exists", "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const organization = await db.withTransaction(async (tx) => {
    const orgResult = await tx.execute(
      `INSERT INTO organizations (name, slug, email, phone)
       VALUES (?, ?, ?, ?)`,
      [
        data.organizationName,
        slugify(data.organizationName),
        data.organizationEmail || data.email,
        normalizePhone(data.phone),
      ]
    );
    const organizationId = orgResult.insertId;

    const userResult = await tx.execute(
      `INSERT INTO users (organization_id, first_name, last_name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ORG_ADMIN', 'ACTIVE')`,
      [
        organizationId,
        data.firstName,
        data.lastName || null,
        data.email,
        normalizePhone(data.phone),
        passwordHash,
      ]
    );
    const userId = userResult.insertId;

    await tx.execute(
      `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
       VALUES (?, ?, ?, 'organization.registered', 'organization', ?, 'INFO')`,
      [organizationId, userId, data.email, String(organizationId)]
    );

    return { organizationId, userId };
  });

  const token = signAccessToken({
    sub: String(organization.userId),
    role: "ORG_ADMIN",
    orgId: String(organization.organizationId),
  });

  return {
    accessToken: token,
    user: {
      id: organization.userId,
      firstName: data.firstName,
      lastName: data.lastName || null,
      email: data.email,
      phone: normalizePhone(data.phone),
      role: "ORG_ADMIN",
      status: "ACTIVE",
      avatarUrl: null,
      organizationId: organization.organizationId,
    },
    organization: {
      id: organization.organizationId,
      name: data.organizationName,
      slug: slugify(data.organizationName),
    },
  };
}

async function login(data) {
  const users = await db.query(
    `SELECT id, first_name, last_name, email, phone, role, status, avatar_url,
            organization_id, password_hash
     FROM users WHERE email = ?`,
    [data.email]
  );
  const user = users[0];

  // Same error for missing email and wrong password — no user enumeration
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const passwordOk = await bcrypt.compare(data.password, user.password_hash);
  if (!passwordOk) {
    throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }
  if (user.status !== "ACTIVE") {
    throw ApiError.forbidden("Your account is not active", "ACCOUNT_INACTIVE");
  }

  await db.execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'user.login', 'user', ?, 'INFO')`,
    [user.organization_id, user.id, user.email, String(user.id)]
  );

  const token = signAccessToken({
    sub: String(user.id),
    role: user.role,
    orgId: user.organization_id ? String(user.organization_id) : null,
  });

  return { accessToken: token, user: serializeUser(user) };
}

async function getCurrentUser(userId) {
  const users = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.status,
            u.avatar_url, u.organization_id,
            o.name AS org_name, o.slug AS org_slug, o.email AS org_email, o.phone AS org_phone
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE u.id = ?`,
    [userId]
  );
  const user = users[0];
  if (!user) throw ApiError.notFound("User not found");

  return {
    user: serializeUser(user),
    organization: user.organization_id
      ? {
          id: user.organization_id,
          name: user.org_name,
          slug: user.org_slug,
          email: user.org_email,
          phone: user.org_phone,
        }
      : null,
  };
}

async function changePassword(userId, data) {
  const users = await db.query(
    "SELECT id, email, organization_id, password_hash FROM users WHERE id = ?",
    [userId]
  );
  const user = users[0];
  if (!user) throw ApiError.notFound("User not found");

  const passwordOk = await bcrypt.compare(data.currentPassword, user.password_hash);
  if (!passwordOk) {
    throw ApiError.unauthorized("Current password is incorrect", "INVALID_PASSWORD");
  }

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'user.password_changed', 'user', ?, 'INFO')`,
    [user.organization_id, userId, user.email, String(userId)]
  );
}

module.exports = {
  registerOrganization,
  login,
  getCurrentUser,
  changePassword,
};
