const dotenv = require("dotenv");

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  JWT_SECRET: process.env.JWT_SECRET || "changia_dev_jwt_secret_change_me_in_production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  DEFAULT_SERVICE_FEE_PERCENT: Number(process.env.DEFAULT_SERVICE_FEE_PERCENT) || 5,
  APP_BASE_URL: process.env.APP_BASE_URL || "http://localhost:3000",
  DB: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "changia",
  },
};

if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET not set — using a development default. Set it in .env for production.");
}

module.exports = { env };
