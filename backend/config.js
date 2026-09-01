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
  // This API's own public origin — used to build absolute URLs for files it
  // serves itself (e.g. /uploads/... completion-report photos).
  API_PUBLIC_URL: process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 5000}`,
  DB: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "changia",
    // Managed MySQL providers need TLS. DB_SSL=true turns it on; DB_SSL_CA is an
    // optional PEM string or path to the provider's CA bundle (strict verify).
    ssl: process.env.DB_SSL === "true" || process.env.DB_SSL === "1",
    sslCa: process.env.DB_SSL_CA || "",
  },

  // ─── Cloudflare R2 object store (uploaded photos) ──────────────────────────
  // Set all four to push uploads to R2 instead of the local disk (see
  // utils/objectStore.js). Unset → uploads stay on disk (local dev / hosting
  // with a persistent disk). Endpoint defaults to
  // https://<accountId>.r2.cloudflarestorage.com.
  R2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET || "",
    endpoint: process.env.R2_ENDPOINT || "",
  },

  // ─── Messaging providers (SMS / WhatsApp / Email) ──────────────────────────
  // "simulated" (default) needs no credentials — every send is logged and
  // recorded in message_deliveries with a synthetic reference so reminders
  // work end-to-end in dev. Set MESSAGE_PROVIDER=live once the credentials
  // below are filled in. See Backend/README.md → "Messaging providers setup".
  MESSAGE_PROVIDER: process.env.MESSAGE_PROVIDER || "simulated",
  SMTP: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "",
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

  // ─── ClickPesa payment gateway ────────────────────────────────────────────────
  CLICKPESA_ENABLED: process.env.CLICKPESA_ENABLED || "false",
  CLICKPESA_BASE_URL:
    process.env.CLICKPESA_BASE_URL || "https://api.clickpesa.com/third-parties",
  CLICKPESA_CLIENT_ID: process.env.CLICKPESA_CLIENT_ID || "",
  CLICKPESA_API_KEY: process.env.CLICKPESA_API_KEY || "",
  CLICKPESA_USE_CHECKSUM: process.env.CLICKPESA_USE_CHECKSUM || "false",
  CLICKPESA_CHECKSUM_SECRET: process.env.CLICKPESA_CHECKSUM_SECRET || "",
  CLICKPESA_TIMEOUT_MS: Number(process.env.CLICKPESA_TIMEOUT_MS) || 15000,

  // ─── Reminder auto-resend scheduler ─────────────────────────────────────────
  REMINDER_SCHEDULER_INTERVAL_MINUTES:
    Number(process.env.REMINDER_SCHEDULER_INTERVAL_MINUTES) || 60,

  // ─── Google Cloud Translation (English → Swahili) ──────────────────────────
  // When set, a campaign's name/story/category/scope/acceptance are
  // auto-translated to Swahili on save (utils/translate.js) and stored in the
  // *_sw columns. Unset → the *_sw columns stay NULL and public /sw pages fall
  // back to the English text. A plain API key for the Translation v2 REST API.
  GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY || "",
  GOOGLE_TRANSLATE_ENDPOINT:
    process.env.GOOGLE_TRANSLATE_ENDPOINT ||
    "https://translation.googleapis.com/language/translate/v2",
};

if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET not set — using a development default. Set it in .env for production.");
}

module.exports = { env };
