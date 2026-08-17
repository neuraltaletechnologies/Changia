const { createApp } = require("./app");
const { env } = require("./config");
const db = require("./db");
const { runMigrations } = require("./migrate");
const { startReminderScheduler } = require("./jobs/reminderScheduler");

const app = createApp();

async function bootstrap() {
  try {
    await db.testConnection();
    console.log("✅ Connected to MySQL database");

    await runMigrations();

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Changia API running on http://localhost:${env.PORT}`);
      console.log(`   Health check: http://localhost:${env.PORT}/api/v1/health`);
      console.log(`   Environment: ${env.NODE_ENV}`);
    });

    const schedulerTask = startReminderScheduler();

    const shutdown = async (signal) => {
      console.log(`\n${signal} received — shutting down gracefully...`);
      schedulerTask.stop();
      server.close(async () => {
        await db.pool.end();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    console.error(
      "   Check that MySQL is running and database.sql has been imported (npm run setup)."
    );
    process.exit(1);
  }
}

void bootstrap();
