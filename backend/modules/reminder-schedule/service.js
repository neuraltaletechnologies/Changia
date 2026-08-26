const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { sendMessage, recipientFor, renderTemplate, buildReminderEmailHtml } = require("../../utils/messaging");
const { env } = require("../../config");
const poolService = require("../donor-pool/service");

function isAdminRole(role) {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN";
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeSchedule(s) {
  return {
    id: s.id,
    name: s.name,
    scope: s.scope,
    poolId: s.pool_id,
    campaignId: s.campaign_id,
    intervalDays: s.interval_days,
    channels: parseJson(s.channels, []),
    templateIdSms: s.template_id_sms,
    templateIdWhatsapp: s.template_id_whatsapp,
    templateIdEmail: s.template_id_email,
    isActive: Boolean(s.is_active),
    nextRunAt: s.next_run_at,
    lastRunAt: s.last_run_at,
    createdBy: s.created_by_id,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

async function loadSchedule(organizationId, id) {
  const rows = await db.query(
    "SELECT * FROM reminder_schedules WHERE id = ? AND organization_id = ?",
    [id, organizationId]
  );
  const schedule = rows[0];
  if (!schedule) throw ApiError.notFound("Reminder schedule not found");
  return schedule;
}

function assertScheduleAccess(user, schedule) {
  if (isAdminRole(user.role)) return;
  if (Number(schedule.created_by_id) === user.id) return;
  throw ApiError.forbidden(
    "You can only manage your own reminder schedules",
    "SCHEDULE_ACCESS_DENIED"
  );
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

async function listSchedules(organizationId, user, filters) {
  const where = ["organization_id = ?"];
  const values = [organizationId];

  if (!isAdminRole(user.role)) {
    where.push("created_by_id = ?");
    values.push(user.id);
  }
  if (filters.scope) {
    where.push("scope = ?");
    values.push(filters.scope);
  }

  const whereSql = where.join(" AND ");
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  const rows = await db.query(
    `SELECT * FROM reminder_schedules WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM reminder_schedules WHERE ${whereSql}`, values)
    .then((rows2) => [rows2]);

  return {
    schedules: rows.map(serializeSchedule),
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
}

async function createSchedule(organizationId, user, data) {
  let poolId = null;
  let campaignId = null;

  if (data.scope === "POOL") {
    const pools = await db.query(
      "SELECT * FROM donor_pools WHERE id = ? AND organization_id = ?",
      [data.poolId, organizationId]
    );
    const pool = pools[0];
    if (!pool) throw ApiError.notFound("Donor pool not found");
    if (pool.is_system) {
      throw ApiError.badRequest(
        "Automatic resend cannot be scheduled for the anomalous pool",
        "SYSTEM_POOL_NOT_ALLOWED"
      );
    }
    if (!isAdminRole(user.role) && Number(pool.created_by_id) !== user.id) {
      throw ApiError.forbidden("You can only schedule resends for your own pools", "POOL_ACCESS_DENIED");
    }
    poolId = pool.id;
  } else {
    const campaigns = await db.query(
      "SELECT id FROM campaigns WHERE id = ? AND organization_id = ?",
      [data.campaignId, organizationId]
    );
    if (campaigns.length === 0) throw ApiError.notFound("Campaign not found");
    campaignId = campaigns[0].id;
  }

  const result = await db.execute(
    `INSERT INTO reminder_schedules
       (organization_id, created_by_id, name, scope, pool_id, campaign_id, interval_days, channels,
        template_id_sms, template_id_whatsapp, template_id_email, is_active, next_run_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
    [
      organizationId,
      user.id,
      data.name.trim(),
      data.scope,
      poolId,
      campaignId,
      data.intervalDays,
      JSON.stringify(data.channels),
      data.templateIdSms || null,
      data.templateIdWhatsapp || null,
      data.templateIdEmail || null,
      data.isActive === undefined ? 1 : data.isActive ? 1 : 0,
      data.intervalDays,
    ]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'reminder_schedule.created', 'reminder_schedule', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(result.insertId)]
  );

  return serializeSchedule(await loadSchedule(organizationId, result.insertId));
}

async function updateSchedule(organizationId, user, id, data) {
  const schedule = await loadSchedule(organizationId, id);
  assertScheduleAccess(user, schedule);

  const fields = [];
  const values = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name.trim()); }
  if (data.intervalDays !== undefined) { fields.push("interval_days = ?"); values.push(data.intervalDays); }
  if (data.channels !== undefined) { fields.push("channels = ?"); values.push(JSON.stringify(data.channels)); }
  if (data.templateIdSms !== undefined) { fields.push("template_id_sms = ?"); values.push(data.templateIdSms); }
  if (data.templateIdWhatsapp !== undefined) { fields.push("template_id_whatsapp = ?"); values.push(data.templateIdWhatsapp); }
  if (data.templateIdEmail !== undefined) { fields.push("template_id_email = ?"); values.push(data.templateIdEmail); }
  if (data.isActive !== undefined) { fields.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }

  if (fields.length > 0) {
    values.push(id);
    await db.execute(`UPDATE reminder_schedules SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  return serializeSchedule(await loadSchedule(organizationId, id));
}

async function deleteSchedule(organizationId, user, id) {
  const schedule = await loadSchedule(organizationId, id);
  assertScheduleAccess(user, schedule);
  await db.execute("DELETE FROM reminder_schedules WHERE id = ?", [id]);

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'reminder_schedule.deleted', 'reminder_schedule', ?, 'WARNING')`,
    [organizationId, user.id, user.email, String(id)]
  );
}

// ─── Scheduler: compute the due donor set and queue a pending batch ─────────
// Never sends anything itself — sending only happens through confirmPending,
// per the approval-queue design (nothing goes out without a manager click).

async function getDueDonorIds(schedule) {
  if (schedule.scope === "POOL") {
    const rows = await db.query(
      `SELECT dpm.donor_id, dpm.expected_amount,
         (SELECT COALESCE(SUM(dd.amount),0) FROM donations dd
           WHERE dd.donor_id = dpm.donor_id AND dd.status = 'CONFIRMED') AS paid
       FROM donor_pool_members dpm
       WHERE dpm.pool_id = ?`,
      [schedule.pool_id]
    );
    return rows
      .filter((r) => {
        const status = poolService.computeStatus(
          r.expected_amount === null ? null : Number(r.expected_amount),
          Number(r.paid)
        );
        return status === "UNPAID" || status === "PARTIAL";
      })
      .map((r) => r.donor_id);
  }

  const rows = await db.query(
    `SELECT cdt.donor_id, cdt.expected_amount,
       (SELECT COALESCE(SUM(dd.amount),0) FROM donations dd
         WHERE dd.donor_id = cdt.donor_id AND dd.campaign_id = cdt.campaign_id AND dd.status = 'CONFIRMED') AS paid
     FROM campaign_donor_targets cdt
     WHERE cdt.campaign_id = ?`,
    [schedule.campaign_id]
  );
  return rows
    .filter((r) => {
      const status = poolService.computeStatus(
        r.expected_amount === null ? null : Number(r.expected_amount),
        Number(r.paid)
      );
      return status === "UNPAID" || status === "PARTIAL";
    })
    .map((r) => r.donor_id);
}

/** Called by Backend/jobs/reminderScheduler.js on every tick. */
async function runDueSchedules() {
  const due = await db.query(
    `SELECT * FROM reminder_schedules WHERE is_active = 1 AND next_run_at <= NOW()`
  );

  let queued = 0;
  for (const schedule of due) {
    try {
      const donorIds = await getDueDonorIds(schedule);
      if (donorIds.length > 0) {
        await db.execute(
          `INSERT INTO reminder_pending_batches (schedule_id, organization_id, status, donor_ids)
           VALUES (?, ?, 'PENDING_APPROVAL', ?)`,
          [schedule.id, schedule.organization_id, JSON.stringify(donorIds)]
        );
        queued += 1;
      }
      await db.execute(
        `UPDATE reminder_schedules
         SET last_run_at = NOW(), next_run_at = DATE_ADD(NOW(), INTERVAL interval_days DAY)
         WHERE id = ?`,
        [schedule.id]
      );
    } catch (error) {
      console.error(`[reminder-scheduler] Failed to process schedule ${schedule.id}:`, error.message);
    }
  }

  return { schedulesChecked: due.length, batchesQueued: queued };
}

// ─── Pending approval queue ─────────────────────────────────────────────────

function serializePending(b) {
  return {
    id: b.id,
    scheduleId: b.schedule_id,
    scheduleName: b.schedule_name,
    scope: b.scope,
    pool: b.pool_id ? { id: b.pool_id, name: b.pool_name } : null,
    campaign: b.campaign_id ? { id: b.campaign_id, name: b.campaign_name } : null,
    channels: parseJson(b.channels, []),
    status: b.status,
    donorCount: parseJson(b.donor_ids, []).length,
    generatedAt: b.generated_at,
    resolvedAt: b.resolved_at,
  };
}

async function listPending(organizationId, user) {
  const where = ["rpb.organization_id = ?", "rpb.status = 'PENDING_APPROVAL'"];
  const values = [organizationId];
  if (!isAdminRole(user.role)) {
    where.push("rs.created_by_id = ?");
    values.push(user.id);
  }

  const rows = await db.query(
    `SELECT rpb.id, rpb.schedule_id, rpb.status, rpb.donor_ids, rpb.generated_at, rpb.resolved_at,
       rs.name AS schedule_name, rs.scope, rs.pool_id, rs.campaign_id, rs.channels,
       p.name AS pool_name, c.name AS campaign_name
     FROM reminder_pending_batches rpb
     JOIN reminder_schedules rs ON rs.id = rpb.schedule_id
     LEFT JOIN donor_pools p ON p.id = rs.pool_id
     LEFT JOIN campaigns c ON c.id = rs.campaign_id
     WHERE ${where.join(" AND ")}
     ORDER BY rpb.generated_at ASC`,
    values
  );

  return { pending: rows.map(serializePending) };
}

async function loadPendingBatch(organizationId, id) {
  const rows = await db.query(
    `SELECT rpb.id, rpb.schedule_id, rpb.organization_id, rpb.status, rpb.donor_ids, rpb.batch_ids,
       rs.created_by_id AS schedule_owner_id, rs.channels, rs.template_id_sms, rs.template_id_whatsapp,
       rs.template_id_email, rs.campaign_id, rs.pool_id, rs.scope
     FROM reminder_pending_batches rpb
     JOIN reminder_schedules rs ON rs.id = rpb.schedule_id
     WHERE rpb.id = ? AND rpb.organization_id = ?`,
    [id, organizationId]
  );
  const batch = rows[0];
  if (!batch) throw ApiError.notFound("Pending reminder batch not found");
  return batch;
}

function assertPendingAccess(user, batch) {
  if (isAdminRole(user.role)) return;
  if (Number(batch.schedule_owner_id) === user.id) return;
  throw ApiError.forbidden("You can only act on your own reminder schedules", "SCHEDULE_ACCESS_DENIED");
}

/**
 * Renders and actually sends the queued batch — the one moment a manager's
 * explicit confirm click turns a schedule into real SMS/WhatsApp/Email
 * traffic. Each donor is messaged on their own preferred_channel where that
 * channel is enabled on the schedule, falling back to the schedule's first
 * enabled channel otherwise.
 */
async function confirmPending(organizationId, user, id) {
  const batch = await loadPendingBatch(organizationId, id);
  assertPendingAccess(user, batch);
  if (batch.status !== "PENDING_APPROVAL") {
    throw ApiError.conflict("This batch was already resolved", "ALREADY_RESOLVED");
  }

  const donorIds = parseJson(batch.donor_ids, []);
  const channels = parseJson(batch.channels, []);
  if (donorIds.length === 0 || channels.length === 0) {
    throw ApiError.badRequest("Nothing to send for this batch", "EMPTY_BATCH");
  }

  const donors = await db.query(
    `SELECT id, first_name, last_name, email, phone, preferred_channel
     FROM donors WHERE id IN (?) AND organization_id = ?`,
    [donorIds, organizationId]
  );

  let subjectContext = "";
  if (batch.campaign_id) {
    const rows = await db.query("SELECT name FROM campaigns WHERE id = ?", [batch.campaign_id]);
    subjectContext = rows[0]?.name || "";
  } else if (batch.pool_id) {
    const rows = await db.query("SELECT name FROM donor_pools WHERE id = ?", [batch.pool_id]);
    subjectContext = rows[0]?.name || "";
  }
  const orgRows = await db.query("SELECT name FROM organizations WHERE id = ?", [organizationId]);
  const orgName = orgRows[0]?.name || "Changia";

  const templateIdByChannel = {
    SMS: batch.template_id_sms,
    WHATSAPP: batch.template_id_whatsapp,
    EMAIL: batch.template_id_email,
  };
  const templateCache = {};
  async function getTemplate(channel) {
    const templateId = templateIdByChannel[channel];
    if (!templateId) return null;
    if (templateId in templateCache) return templateCache[templateId];
    const rows = await db.query("SELECT * FROM message_templates WHERE id = ?", [templateId]);
    templateCache[templateId] = rows[0] || null;
    return templateCache[templateId];
  }

  // Group donors by the channel they'll actually be messaged on.
  const byChannel = {};
  for (const donor of donors) {
    const channel = channels.includes(donor.preferred_channel) ? donor.preferred_channel : channels[0];
    if (!byChannel[channel]) byChannel[channel] = [];
    byChannel[channel].push(donor);
  }

  const batchIds = [];
  const deliveries = [];

  // Fetch campaign slug for building donation links
  let campaignUrl = null;
  if (batch.campaign_id) {
    const campRows = await db.query(
      "SELECT slug, name FROM campaigns WHERE id = ?",
      [batch.campaign_id]
    );
    if (campRows[0]) {
      campaignUrl = `${env.APP_BASE_URL}/campaigns/${campRows[0].slug || batch.campaign_id}`;
    }
  }

  for (const [channel, channelDonors] of Object.entries(byChannel)) {
    const template = await getTemplate(channel);
    const batchResult = await db.execute(
      `INSERT INTO message_batches
         (organization_id, campaign_id, created_by_id, type, subject, body, status, recipient_count)
       VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?)`,
      [
        organizationId,
        batch.campaign_id || null,
        user.id,
        channel,
        template?.subject || null,
        template?.body || `Reminder from ${orgName}`,
        channelDonors.length,
      ]
    );
    const msgBatchId = batchResult.insertId;
    batchIds.push(msgBatchId);

    for (const donor of channelDonors) {
      const vars = {
        donorName: [donor.first_name, donor.last_name].filter(Boolean).join(" ") || "Donor",
        campaignName: subjectContext,
        orgName,
        amountDue: "",
      };
      const subject = renderTemplate(template?.subject || "", vars);
      const body = renderTemplate(template?.body || `Reminder from ${orgName}`, vars);
      const recipient = recipientFor(channel, donor) || donor.phone;

      // Build HTML email for EMAIL channel with campaign link
      let html = null;
      if (channel === "EMAIL" && recipient) {
        html = buildReminderEmailHtml({
          donorName: vars.donorName,
          campaignName: subjectContext,
          campaignUrl,
          orgName,
          messageBody: body,
        });
      }

      const result = recipient
        ? await sendMessage({ channel, to: recipient, subject, body, html })
        : { status: "FAILED", providerRef: null, error: "Donor has no contact for this channel" };

      await db.execute(
        `INSERT INTO message_deliveries (batch_id, donor_id, recipient, status, provider_ref, error, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [msgBatchId, donor.id, recipient || "", result.status, result.providerRef || null, result.error || null]
      );
      deliveries.push({ donorId: donor.id, channel, status: result.status });
    }
  }

  await db.execute(
    `UPDATE reminder_pending_batches
     SET status = 'CONFIRMED', resolved_at = NOW(), resolved_by_id = ?, batch_ids = ?
     WHERE id = ?`,
    [user.id, JSON.stringify(batchIds), id]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'reminder_schedule.pending.confirmed', 'reminder_pending_batch', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(id)]
  );

  return { confirmed: true, deliveries };
}

async function skipPending(organizationId, user, id) {
  const batch = await loadPendingBatch(organizationId, id);
  assertPendingAccess(user, batch);
  if (batch.status !== "PENDING_APPROVAL") {
    throw ApiError.conflict("This batch was already resolved", "ALREADY_RESOLVED");
  }

  await db.execute(
    `UPDATE reminder_pending_batches SET status = 'SKIPPED', resolved_at = NOW(), resolved_by_id = ? WHERE id = ?`,
    [user.id, id]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'reminder_schedule.pending.skipped', 'reminder_pending_batch', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(id)]
  );

  return { skipped: true };
}

module.exports = {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listPending,
  confirmPending,
  skipPending,
  runDueSchedules,
};
