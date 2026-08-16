/**
 * Background job: checks every REMINDER_SCHEDULER_INTERVAL_MINUTES for due
 * reminder schedules and queues a PENDING_APPROVAL batch for each one that
 * has unpaid/partial donors. It never sends anything itself — a manager must
 * confirm the batch from /dashboard/reminders before any message goes out
 * (see reminder-schedule/service.js confirmPending).
 */
const cron = require("node-cron");
const { env } = require("../config");
const scheduleService = require("../modules/reminder-schedule/service");

function startReminderScheduler() {
  const minutes = Math.max(1, env.REMINDER_SCHEDULER_INTERVAL_MINUTES || 60);
  // node-cron has no native "every N minutes" for arbitrary N>59 in a single
  // field, so express it as a repeating minute pattern via */N when N<=59,
  // otherwise fall back to hourly (still configurable through the env var
  // for the common case).
  const pattern = minutes <= 59 ? `*/${minutes} * * * *` : `0 * * * *`;

  const task = cron.schedule(pattern, async () => {
    try {
      const result = await scheduleService.runDueSchedules();
      if (result.batchesQueued > 0) {
        console.log(
          `[reminder-scheduler] checked ${result.schedulesChecked} schedule(s), queued ${result.batchesQueued} batch(es) for approval`
        );
      }
    } catch (error) {
      console.error("[reminder-scheduler] tick failed:", error.message);
    }
  });

  console.log(`⏰ Reminder auto-resend scheduler running every ${minutes} minute(s)`);
  return task;
}

module.exports = { startReminderScheduler };
