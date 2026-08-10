const db = require("../db");
const { ApiError } = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/token");

/**
 * Verifies the Bearer token and loads the fresh user from MySQL
 * (so role/status changes take effect immediately).
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw ApiError.unauthorized();
    }

    const token = header.slice("Bearer ".length).trim();
    const payload = verifyAccessToken(token);

    const users = await db.query(
      `SELECT id, email, role, status, organization_id
       FROM users WHERE id = ?`,
      [payload.sub]
    );
    const user = users[0];

    if (!user) throw ApiError.unauthorized("Account no longer exists");
    if (user.status !== "ACTIVE") {
      throw ApiError.forbidden("Account is not active", "ACCOUNT_INACTIVE");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
    };
    next();
  } catch (error) {
    next(error);
  }
}

/** Restricts a route to one or more roles. Must run after `authenticate`. */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          "You do not have permission to perform this action",
          "INSUFFICIENT_ROLE"
        )
      );
    }
    next();
  };
}

module.exports = { authenticate, authorize };
