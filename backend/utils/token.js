const jwt = require("jsonwebtoken");
const { env } = require("../config");
const { ApiError } = require("./ApiError");

function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || !decoded.sub) throw new Error("Invalid token payload");
    return decoded;
  } catch {
    throw ApiError.unauthorized("Invalid or expired token", "INVALID_TOKEN");
  }
}

module.exports = { signAccessToken, verifyAccessToken };
