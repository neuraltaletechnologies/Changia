const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../../db");
const { env } = require("../../config");
const { ApiError } = require("../../utils/ApiError");
const { normalizePhone } = require("../../utils/phone");
const { signAccessToken } = require("../../utils/token");
const { sendEmail, buildPasswordResetEmail } = require("../../utils/email");

/** How long an emailed password-reset link stays valid. */
const RESET_TOKEN_TTL_MINUTES = 60;

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

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
    mustChangePassword: Boolean(user.must_change_password),
  };
}

/**
 * Registers a new organization together with its first member.
 * Every registered user is created as a CAMPAIGN_MANAGER by default — an
 * administrator (SUPER_ADMIN / ORG_ADMIN) later assigns other roles.
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
       VALUES (?, ?, ?, ?, ?, ?, 'CAMPAIGN_MANAGER', 'ACTIVE')`,
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
    role: "CAMPAIGN_MANAGER",
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
      role: "CAMPAIGN_MANAGER",
      status: "ACTIVE",
      avatarUrl: null,
      organizationId: organization.organizationId,
      mustChangePassword: false,
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
            organization_id, must_change_password, password_hash
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
            u.avatar_url, u.organization_id, u.must_change_password,
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
  await db.execute(
    "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
    [passwordHash, userId]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'user.password_changed', 'user', ?, 'INFO')`,
    [user.organization_id, userId, user.email, String(userId)]
  );
}

/**
 * Starts the "forgot password" flow. Always resolves the same way (no
 * indication of whether the email exists) — if a matching active user is found,
 * any earlier unused tokens are dropped, a fresh single-use token is stored
 * (hashed) and the raw token is emailed inside a reset link.
 */
async function requestPasswordReset(data) {
  const users = await db.query(
    "SELECT id, first_name, email, status FROM users WHERE email = ?",
    [data.email]
  );
  const user = users[0];

  if (user && user.status === "ACTIVE") {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await db.execute(
      "DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL",
      [user.id]
    );
    await db.execute(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, hashToken(rawToken), expiresAt]
    );

    const resetUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Changia password",
        html: buildPasswordResetEmail({
          firstName: user.first_name,
          resetUrl,
          expiresMinutes: RESET_TOKEN_TTL_MINUTES,
        }),
        text: `Reset your Changia password using this link (valid for ${RESET_TOKEN_TTL_MINUTES} minutes): ${resetUrl}`,
      });
    } catch (err) {
      // Don't leak send failures to the caller — the response is intentionally
      // identical whether or not an email went out.
      console.error("📧 Password reset email failed:", err.message);
    }
  }

  return { message: "If that email is registered, a reset link is on its way." };
}

/**
 * Completes the flow: validates the emailed token, sets the new password and
 * burns the token. Also clears `must_change_password` so an admin-invited user
 * who used "forgot password" isn't asked to change it again.
 */
async function resetPassword(data) {
  const rows = await db.query(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email, u.organization_id
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = ?`,
    [hashToken(data.token)]
  );
  const row = rows[0];

  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    throw ApiError.badRequest(
      "This reset link is invalid or has expired. Please request a new one.",
      "INVALID_RESET_TOKEN"
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  await db.withTransaction(async (tx) => {
    await tx.execute(
      "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
      [passwordHash, row.user_id]
    );
    await tx.execute(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?",
      [row.id]
    );
    // Invalidate any other outstanding tokens for this user.
    await tx.execute(
      "DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL",
      [row.user_id]
    );
    await tx.execute(
      `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
       VALUES (?, ?, ?, 'user.password_reset', 'user', ?, 'WARNING')`,
      [row.organization_id, row.user_id, row.email, String(row.user_id)]
    );
  });

  return { message: "Your password has been reset. You can now sign in." };
}

async function recordLogout(user) {
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'user.logout', 'user', ?, 'INFO')`,
    [user.organizationId, user.id, user.email, String(user.id)]
  );
}

module.exports = {
  registerOrganization,
  login,
  getCurrentUser,
  changePassword,
  requestPasswordReset,
  resetPassword,
  recordLogout,
};
