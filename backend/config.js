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

  // ─── Messaging providers (SMS / WhatsApp / Email) ──────────────────────────
  // "simulated" (default) needs no credentials — every send is logged and
  // recorded in message_deliveries with a synthetic reference so reminders
  // work end-to-end in dev. Set MESSAGE_PROVIDER=live once the credentials
  // below are filled in. See Backend/README.md → "Messaging providers setup".
  MESSAGE_PROVIDER: process.env.MESSAGE_PROVIDER || "simulated",
  SMTP: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    fromEmail: process.env.SMTP_FROM_EMAIL || "",
    fromName: process.env.SMTP_FROM_NAME || "Changia",
  },
  AFRICAS_TALKING: {
    username: process.env.AT_USERNAME || "",
    apiKey: process.env.AT_API_KEY || "",
    senderId: process.env.AT_SENDER_ID || "",
  },
  WHATSAPP: {
    token: process.env.WHATSAPP_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
  },

  // ─── Reminder auto-resend scheduler ─────────────────────────────────────────
  REMINDER_SCHEDULER_INTERVAL_MINUTES:
    Number(process.env.REMINDER_SCHEDULER_INTERVAL_MINUTES) || 60,
};

if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET not set — using a development default. Set it in .env for production.");
}

module.exports = { env };
