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
const donorRoutes = require("./modules/donor/routes");
const donorPoolRoutes = require("./modules/donor-pool/routes");
const donationRoutes = require("./modules/donation/routes");
const auditRoutes = require("./modules/audit/routes");
const reminderTemplateRoutes = require("./modules/reminder-template/routes");
const reminderScheduleRoutes = require("./modules/reminder-schedule/routes");

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
  app.use("/api/v1/campaigns", campaignRoutes);
  app.use("/api/v1/donors", donorRoutes);
  app.use("/api/v1/donor-pools", donorPoolRoutes);
  app.use("/api/v1/donations", donationRoutes);
  app.use("/api/v1/audit-logs", auditRoutes);
  app.use("/api/v1/reminder-templates", reminderTemplateRoutes);
  app.use("/api/v1/reminder-schedules", reminderScheduleRoutes);

  // ─── 404 & error handling (must be last) ────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
