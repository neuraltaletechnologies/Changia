const path = require("path");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { env } = require("./config");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");
const { apiLimiter } = require("./middlewares/rateLimiter");
const authRoutes = require("./modules/auth/routes");
const organizationRoutes = require("./modules/organization/routes");
const userRoutes = require("./modules/user/routes");
const campaignRoutes = require("./modules/campaign/routes");
const campaignPublicRoutes = require("./modules/campaign/publicRoutes");
const donorRoutes = require("./modules/donor/routes");
const donorPoolRoutes = require("./modules/donor-pool/routes");
const donationRoutes = require("./modules/donation/routes");
const donationPublicRoutes = require("./modules/donation/publicRoutes");
const auditRoutes = require("./modules/audit/routes");
const reminderTemplateRoutes = require("./modules/reminder-template/routes");
const reminderScheduleRoutes = require("./modules/reminder-schedule/routes");
const payoutRoutes = require("./modules/payout/routes");
const settingsRoutes = require("./modules/settings/routes");
const notificationRoutes = require("./modules/notification/routes");
const webhookRoutes = require("./routes/webhooks");

function createApp() {
  const app = express();

  // ─── Security & parsing ─────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.CORS_ORIGINS.includes("*") || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Origin not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  // Uploaded files (campaign + completion-report photos) — served at /uploads/...,
  // deliberately outside the /api/v1 prefix since these are plain static assets.
  // helmet()'s default `Cross-Origin-Resource-Policy: same-origin` would stop the
  // web app (served from its own origin/subdomain) from loading these photos in
  // <img> tags, so relax CORP for this path only.
  app.use(
    "/uploads",
    helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
    express.static(path.join(__dirname, "uploads"))
  );

  // ─── Routes ─────────────────────────────────────────────────────────────────
  app.get("/", (req, res) => {
    res.json({
      name: "Changia API",
      version: "0.1.0",
      docs: "/api/v1/health",
      environment: env.NODE_ENV,
    });
  });

  app.get("/api/v1/health", (req, res) => {
    res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/v1/auth", apiLimiter, authRoutes);
  app.use("/api/v1/organizations", organizationRoutes);
  app.use("/api/v1/users", userRoutes);
  // Public, unauthenticated marketing-site endpoints (mounted before the
  // authenticated /campaigns and /donations routers, distinct path prefix).
  app.use("/api/v1/public/campaigns", apiLimiter, campaignPublicRoutes);
  app.use("/api/v1/public/donations", apiLimiter, donationPublicRoutes);
  app.use("/api/v1/campaigns", campaignRoutes);
  app.use("/api/v1/donors", donorRoutes);
  app.use("/api/v1/donor-pools", donorPoolRoutes);
  app.use("/api/v1/donations", donationRoutes);
  app.use("/api/v1/audit-logs", auditRoutes);
  app.use("/api/v1/reminder-templates", reminderTemplateRoutes);
  app.use("/api/v1/reminder-schedules", reminderScheduleRoutes);
  app.use("/api/v1/payouts", payoutRoutes);
  app.use("/api/v1/settings", settingsRoutes);
  app.use("/api/v1/notifications", notificationRoutes);

  // ─── Webhooks (unauthenticated — verified by checksum) ────────────────────
  app.use("/webhooks", webhookRoutes);

  // ─── 404 & error handling (must be last) ────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
