const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { normalizePhone } = require("../../utils/phone");
const {
  sendMessage,
  recipientFor,
  buildReminderEmailHtml,
  renderTemplate,
} = require("../../utils/messaging");
const { env } = require("../../config");
const donorService = require("../donor/service");

const ANOMALOUS_POOL_NAME = "Anomalous / Unmatched";

function num(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function computeStatus(expected, paid) {
  if (expected === null || expected === undefined) {
    return paid > 0 ? "PAID_FULL" : "UNPAID";
  }
  if (paid <= 0) return "UNPAID";
  if (paid >= expected) return "PAID_FULL";
  return "PARTIAL";
}

function serializePool(p) {
  const creator = p.first_name
    ? { id: p.created_by_id, firstName: p.first_name, lastName: p.last_name, email: p.email }
    : null;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    isSystem: Boolean(p.is_system),
    status: p.status,
    createdBy: creator,
    memberCount: num(p.member_count),
    expectedTotal: num(p.expected_total),
    paidTotal: num(p.paid_total),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function isAdminRole(role) {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN";
}

/**
 * Pool is visible when created by the user or the user is an admin. This
 * applies uniformly to regular pools and to system (anomalous) pools — each
 * manager's anomalous pool is scoped to them the same way a regular pool is;
 * see ensureAnomalousPool below.
 */
function canViewPool(user, pool) {
  if (isAdminRole(user.role)) return true;
  return Number(pool.created_by_id) === user.id;
}

async function loadPool(organizationId, poolId) {
  const rows = await db.query(
    `SELECT p.*, u.first_name, u.last_name, u.email
     FROM donor_pools p
     LEFT JOIN users u ON u.id = p.created_by_id
     WHERE p.id = ? AND p.organization_id = ?`,
    [poolId, organizationId]
  );
  const pool = rows[0];
  if (!pool) throw ApiError.notFound("Donor pool not found");
  return pool;
}

function assertPoolAccess(user, pool) {
  if (isAdminRole(user.role)) return;
  if (canViewPool(user, pool)) return;
  throw ApiError.forbidden("You can only manage your own donor pools", "POOL_ACCESS_DENIED");
}

// ─── Anomalous pool (system) ────────────────────────────────────────────────
// Each campaign manager gets their own anomalous pool — a manager only sees
// unmatched donations that landed on campaigns they are assigned to.
// managerId === null/undefined means the org-wide fallback pool, used when a
// donation lands on a campaign with no assigned manager (e.g. an admin-run
// campaign). Admins can view any manager's anomalous pool.

async function ensureAnomalousPool(organizationId, managerId) {
  const rows = await db.query(
    managerId
      ? `SELECT id FROM donor_pools
         WHERE organization_id = ? AND is_system = 1 AND status = 'ACTIVE' AND created_by_id = ?
         LIMIT 1`
      : `SELECT id FROM donor_pools
         WHERE organization_id = ? AND is_system = 1 AND status = 'ACTIVE' AND created_by_id IS NULL
         LIMIT 1`,
    managerId ? [organizationId, managerId] : [organizationId]
  );
  if (rows[0]) return rows[0].id;

  const name = managerId ? ANOMALOUS_POOL_NAME : `${ANOMALOUS_POOL_NAME} (Unassigned)`;
  const result = await db.execute(
    `INSERT INTO donor_pools (organization_id, created_by_id, name, category, is_system, status)
     VALUES (?, ?, ?, 'FAMILY', 1, 'ACTIVE')`,
    [organizationId, managerId || null, name]
  );
  return result.insertId;
}

async function ensureAnomalousPoolMember(organizationId, donorId, managerId) {
  const poolId = await ensureAnomalousPool(organizationId, managerId);
  await db.execute(
    `INSERT IGNORE INTO donor_pool_members (pool_id, donor_id, added_by_id)
     VALUES (?, ?, NULL)`,
    [poolId, donorId]
  );
  return poolId;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

async function listPools(organizationId, user, filters) {
  const where = ["p.organization_id = ?"];
  const values = [organizationId];

  if (!isAdminRole(user.role)) {
    where.push("p.created_by_id = ?");
    values.push(user.id);
  } else if (filters.createdBy) {
    where.push("p.created_by_id = ?");
    values.push(filters.createdBy);
  }

  if (filters.category) {
    where.push("p.category = ?");
    values.push(filters.category);
  }
  if (filters.status) {
    where.push("p.status = ?");
    values.push(filters.status);
  }
  if (filters.search) {
    where.push("p.name LIKE ?");
    values.push(`%${filters.search}%`);
  }

  const sortColumn = {
    name: "p.name",
    created: "p.created_at",
    members: "member_count",
  }[filters.sortBy || "created"];

  const sortDir = filters.sortDir === "asc" ? "ASC" : "DESC";

  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;

  const whereSql = where.join(" AND ");

  const pools = await db.query(
    `SELECT p.*, u.first_name, u.last_name, u.email,
       (SELECT COUNT(*) FROM donor_pool_members dpm WHERE dpm.pool_id = p.id) AS member_count,
       (SELECT COALESCE(SUM(dpm.expected_amount),0) FROM donor_pool_members dpm WHERE dpm.pool_id = p.id) AS expected_total,
       (SELECT COALESCE(SUM(dd.amount),0) FROM donations dd
         WHERE dd.status = 'CONFIRMED'
           AND dd.donor_id IN (SELECT dpm2.donor_id FROM donor_pool_members dpm2 WHERE dpm2.pool_id = p.id)
       ) AS paid_total
     FROM donor_pools p
     LEFT JOIN users u ON u.id = p.created_by_id
     WHERE ${whereSql}
     ORDER BY ${sortColumn} ${sortDir}, p.id DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM donor_pools p WHERE ${whereSql}`, values)
    .then((rows) => [rows]);

  return {
    pools: pools.map(serializePool),
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
}

async function createPool(organizationId, user, data) {
  let createdBy = user.id;
  if (data.createdBy) {
    if (!isAdminRole(user.role)) {
      throw ApiError.forbidden("Only administrators can create a pool on behalf of a manager");
    }
    const owners = await db.query(
      `SELECT id FROM users
       WHERE id = ? AND organization_id = ? AND role = 'CAMPAIGN_MANAGER'`,
      [data.createdBy, organizationId]
    );
    if (owners.length === 0) {
      throw ApiError.badRequest("The selected manager is not part of this organization");
    }
    createdBy = data.createdBy;
  }

  const result = await db.execute(
    `INSERT INTO donor_pools (organization_id, created_by_id, name, description, category, status)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
    [organizationId, createdBy, data.name.trim(), data.description || null, data.category || "FAMILY"]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'donor_pool.created', 'donor_pool', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(result.insertId)]
  );

  return serializePool(await loadPool(organizationId, result.insertId));
}

async function updatePool(organizationId, user, poolId, data) {
  const pool = await loadPool(organizationId, poolId);
  assertPoolAccess(user, pool);

  const fields = [];
  const values = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name.trim()); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description || null); }
  if (data.category !== undefined) { fields.push("category = ?"); values.push(data.category); }
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }

  if (fields.length > 0) {
    values.push(poolId);
    await db.execute(`UPDATE donor_pools SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'donor_pool.updated', 'donor_pool', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(poolId)]
  );

  return serializePool(await loadPool(organizationId, poolId));
}

async function deletePool(organizationId, user, poolId) {
  const pool = await loadPool(organizationId, poolId);
  assertPoolAccess(user, pool);
  if (pool.is_system) {
    throw ApiError.badRequest("The system anomalous pool cannot be deleted", "SYSTEM_POOL");
  }

  await db.execute("DELETE FROM donor_pools WHERE id = ?", [poolId]);
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'donor_pool.deleted', 'donor_pool', ?, 'WARNING')`,
    [organizationId, user.id, user.email, String(poolId)]
  );
}

// ─── Members ────────────────────────────────────────────────────────────────

function serializeMember(m, campaignId) {
  let status = null;
  const poolExpected =
    m.expected_amount === null || m.expected_amount === undefined
      ? null
      : Number(m.expected_amount);
  const expected = campaignId
    ? m.campaign_expected === null || m.campaign_expected === undefined
      ? poolExpected
      : Number(m.campaign_expected)
    : poolExpected;
  const paid = campaignId ? num(m.campaign_paid) : num(m.total_paid);

  if (campaignId) {
    status = computeStatus(expected, paid);
  }

  return {
    id: m.id,
    expectedAmount: poolExpected,
    paidAmount: num(m.total_paid),
    donationCount: num(m.donation_count),
    status,
    addedAt: m.added_at,
    donor: {
      id: m.donor_id,
      firstName: m.first_name,
      lastName: m.last_name,
      email: m.email,
      phone: m.phone,
      gender: m.gender,
      position: m.position,
      isAnomalous: Boolean(m.is_anomalous),
      status: m.status,
      consentStatus: m.consent_status,
      preferredChannel: m.preferred_channel,
      location: m.location,
    },
  };
}

async function getPool(organizationId, user, poolId, campaignId) {
  const pool = await loadPool(organizationId, poolId);
  if (!canViewPool(user, pool)) {
    throw ApiError.forbidden("You cannot view this donor pool", "POOL_ACCESS_DENIED");
  }

  let campaign = null;
  if (campaignId) {
    const rows = await db.query(
      "SELECT id, name FROM campaigns WHERE id = ? AND organization_id = ?",
      [campaignId, organizationId]
    );
    if (rows.length === 0) throw ApiError.notFound("Campaign not found");
    campaign = rows[0];
  }

  const members = await db.query(
    `SELECT dpm.id, dpm.donor_id, dpm.expected_amount, dpm.added_at,
       d.first_name, d.last_name, d.email, d.phone, d.location, d.gender,
       d.position, d.status, d.consent_status, d.preferred_channel, d.is_anomalous,
       (SELECT COALESCE(SUM(dd.amount),0) FROM donations dd
         WHERE dd.donor_id = d.id AND dd.status = 'CONFIRMED') AS total_paid,
       (SELECT COUNT(*) FROM donations dd
         WHERE dd.donor_id = d.id AND dd.status = 'CONFIRMED') AS donation_count,
       cdt.expected_amount AS campaign_expected,
       (SELECT COALESCE(SUM(dd.amount),0) FROM donations dd
         WHERE dd.donor_id = d.id AND dd.campaign_id = ? AND dd.status = 'CONFIRMED') AS campaign_paid
     FROM donor_pool_members dpm
     JOIN donors d ON d.id = dpm.donor_id
     LEFT JOIN campaign_donor_targets cdt
       ON cdt.donor_id = d.id AND cdt.campaign_id = ?
     WHERE dpm.pool_id = ?
     ORDER BY d.created_at DESC`,
    campaignId ? [campaignId, campaignId, poolId] : [null, null, poolId]
  );

  const expectedTotal = members.reduce(
    (s, m) => s + (m.expected_amount === null ? 0 : Number(m.expected_amount)),
    0
  );

  return {
    ...serializePool({
      ...pool,
      member_count: members.length,
      expected_total: expectedTotal,
      paid_total: members.reduce((s, m) => s + num(m.total_paid), 0),
    }),
    campaign: campaign ? { id: campaign.id, name: campaign.name } : null,
    members: members.map((m) => serializeMember(m, campaignId)),
  };
}

async function addMembers(organizationId, user, poolId, data) {
  const pool = await loadPool(organizationId, poolId);
  assertPoolAccess(user, pool);
  if (pool.is_system) {
    throw ApiError.badRequest("Use the merge flow to manage the anomalous pool", "SYSTEM_POOL");
  }

  const donorIds = [];

  // Direct creation of new donors that are then added to the pool.
  if (data.donors && data.donors.length > 0) {
    for (const donorData of data.donors) {
      const created = await donorService.createDonor(organizationId, donorData);
      donorIds.push(created.id);
    }
  }

  if (data.donorIds && data.donorIds.length > 0) {
    for (const id of data.donorIds) donorIds.push(Number(id));
  }

  if (donorIds.length === 0) {
    throw ApiError.badRequest("Provide donorIds or donors to add to the pool");
  }

  const expectedAmounts = data.expectedAmounts || {};

  await db.withTransaction(async (tx) => {
    for (const donorId of donorIds) {
      const amount =
        expectedAmounts[String(donorId)] !== undefined
          ? expectedAmounts[String(donorId)]
          : null;
      await tx.execute(
        `INSERT INTO donor_pool_members (pool_id, donor_id, expected_amount, added_by_id)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE expected_amount = IF(? IS NULL, expected_amount, ?)`,
        [poolId, donorId, amount, user.id, amount, amount]
      );
    }
  });

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'donor_pool.member.added', 'donor_pool_member', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(poolId)]
  );

  return getPool(organizationId, user, poolId);
}

async function setMemberExpected(organizationId, user, poolId, donorId, expectedAmount) {
  const pool = await loadPool(organizationId, poolId);
  assertPoolAccess(user, pool);

  const existing = await db.query(
    "SELECT id FROM donor_pool_members WHERE pool_id = ? AND donor_id = ?",
    [poolId, donorId]
  );
  if (existing.length === 0) throw ApiError.notFound("Donor is not a member of this pool");

  await db.execute(
    `UPDATE donor_pool_members SET expected_amount = ? WHERE pool_id = ? AND donor_id = ?`,
    [expectedAmount, poolId, donorId]
  );

  return getPool(organizationId, user, poolId);
}

async function removeMember(organizationId, user, poolId, donorId) {
  const pool = await loadPool(organizationId, poolId);
  assertPoolAccess(user, pool);

  await db.execute(
    "DELETE FROM donor_pool_members WHERE pool_id = ? AND donor_id = ?",
    [poolId, donorId]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'donor_pool.member.removed', 'donor_pool_member', ?, 'INFO')`,
    [organizationId, user.id, user.email, `${poolId}:${donorId}`]
  );

  return getPool(organizationId, user, poolId);
}

// ─── Duplicate resolution across pools ──────────────────────────────────────

async function listDuplicateGroups(organizationId, user, poolIds) {
  // Scope to pools the user can access.
  let where = "organization_id = ?";
  const values = [organizationId];
  if (!isAdminRole(user.role)) {
    where += " AND created_by_id = ?";
    values.push(user.id);
  }
  if (poolIds && poolIds.length > 0) {
    where += " AND id IN (?)";
    values.push(poolIds);
  }

  const pools = await db.query(`SELECT id FROM donor_pools WHERE ${where}`, values);
  if (pools.length === 0) return { groups: [] };
  const scopedPoolIds = pools.map((p) => p.id);

  const rows = await db.query(
    `SELECT dpm.donor_id,
       COUNT(*) AS pool_count,
       d.first_name, d.last_name, d.email, d.phone
     FROM donor_pool_members dpm
     JOIN donors d ON d.id = dpm.donor_id
     WHERE dpm.pool_id IN (?)
     GROUP BY dpm.donor_id, d.first_name, d.last_name, d.email, d.phone
     HAVING COUNT(*) > 1
     ORDER BY d.first_name, d.last_name`,
    [scopedPoolIds]
  );

  if (rows.length === 0) return { groups: [] };

  const groups = await Promise.all(
    rows.map(async (r) => {
      const memberships = await db.query(
        `SELECT p.id, p.name, p.category, p.is_system, dpm.added_at
         FROM donor_pool_members dpm
         JOIN donor_pools p ON p.id = dpm.pool_id
         WHERE dpm.donor_id = ? AND dpm.pool_id IN (?)
         ORDER BY p.created_at ASC`,
        [r.donor_id, scopedPoolIds]
      );
      return {
        donor: {
          id: r.donor_id,
          firstName: r.first_name,
          lastName: r.last_name,
          email: r.email,
          phone: r.phone,
        },
        pools: memberships.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          isSystem: Boolean(m.is_system),
        })),
      };
    })
  );

  return { groups };
}

async function resolveDuplicates(organizationId, user, data) {
  await db.withTransaction(async (tx) => {
    for (const choice of data.choices) {
      const donorId = Number(choice.donorId);
      const keepPoolId = Number(choice.keepPoolId);

      const keep = await tx.query(
        "SELECT * FROM donor_pools WHERE id = ? AND organization_id = ?",
        [keepPoolId, organizationId]
      );
      if (keep.length === 0) {
        throw ApiError.notFound(`Pool ${keepPoolId} not found`);
      }
      if (!isAdminRole(user.role) && !canViewPool(user, keep[0])) {
        throw ApiError.forbidden("You cannot modify that pool", "POOL_ACCESS_DENIED");
      }

      // Remove the donor from every other pool they belong to (scoped to the
      // pools the user can manage).
      await tx.execute(
        `DELETE dpm FROM donor_pool_members dpm
         JOIN donor_pools p ON p.id = dpm.pool_id
         WHERE dpm.donor_id = ? AND p.organization_id = ?
           AND dpm.pool_id <> ?
           AND (p.created_by_id = ? OR ? = 1)`,
        [donorId, organizationId, keepPoolId, user.id, isAdminRole(user.role) ? 1 : 0]
      );

      // Ensure the donor is present in the pool being kept.
      await tx.execute(
        `INSERT IGNORE INTO donor_pool_members (pool_id, donor_id, added_by_id)
         VALUES (?, ?, ?)`,
        [keepPoolId, donorId, user.id]
      );
    }
  });

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'donor_pool.duplicates.resolved', 'donor_pool_member', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(data.choices.length)]
  );

  return { resolved: data.choices.length };
}

// ─── Anomalous pool + merge ─────────────────────────────────────────────────

/**
 * A CAMPAIGN_MANAGER always sees their own anomalous pool. An admin can pass
 * `managerId` to view a specific manager's pool, or omit it to view the
 * org-wide "Unassigned" fallback pool.
 */
async function getAnomalousPool(organizationId, user, managerId) {
  const ownerId = isAdminRole(user.role) ? (managerId ? Number(managerId) : null) : user.id;
  const poolId = await ensureAnomalousPool(organizationId, ownerId);
  return getPool(organizationId, user, poolId);
}

async function mergeAnomalous(organizationId, user, anomalousDonorId, data) {
  const anomalous = await db.query(
    `SELECT * FROM donors WHERE id = ? AND organization_id = ? AND is_anomalous = 1`,
    [anomalousDonorId, organizationId]
  );
  if (anomalous.length === 0) {
    throw ApiError.notFound("Anomalous donor not found");
  }

  const targets = await db.query(
    `SELECT * FROM donors WHERE id = ? AND organization_id = ?`,
    [data.targetDonorId, organizationId]
  );
  const target = targets[0];
  if (!target) throw ApiError.notFound("Target donor not found");
  if (target.is_anomalous) {
    throw ApiError.badRequest("You can only merge into a known donor", "BAD_MERGE_TARGET");
  }

  const anomalousId = Number(anomalousDonorId);
  const targetId = Number(data.targetDonorId);

  if (anomalousId === targetId) {
    throw ApiError.badRequest("Source and target donor are the same", "BAD_MERGE_TARGET");
  }

  await db.withTransaction(async (tx) => {
    // Donations move to the target donor.
    await tx.execute("UPDATE donations SET donor_id = ? WHERE donor_id = ?", [
      targetId,
      anomalousId,
    ]);

    // Campaign targets: drop any that collide with the target donor's, then move the rest.
    await tx.execute(
      `DELETE cdt FROM campaign_donor_targets cdt
       WHERE cdt.donor_id = ? AND cdt.campaign_id IN
         (SELECT campaign_id FROM campaign_donor_targets WHERE donor_id = ?)`,
      [anomalousId, targetId]
    );
    await tx.execute("UPDATE campaign_donor_targets SET donor_id = ? WHERE donor_id = ?", [
      targetId,
      anomalousId,
    ]);

    // Pool memberships: drop collisions, then move the rest.
    await tx.execute(
      `DELETE dpm FROM donor_pool_members dpm
       WHERE dpm.donor_id = ? AND dpm.pool_id IN
         (SELECT pool_id FROM donor_pool_members WHERE donor_id = ?)`,
      [anomalousId, targetId]
    );
    await tx.execute("UPDATE donor_pool_members SET donor_id = ? WHERE donor_id = ?", [
      targetId,
      anomalousId,
    ]);

    // A previously-unregistered payment method can be captured onto the known donor.
    if (data.paymentMethod) {
      await tx.execute(
        `INSERT INTO donor_payment_methods
           (donor_id, organization_id, method, account_ref, details, is_primary)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [
          targetId,
          organizationId,
          data.paymentMethod.method,
          data.paymentMethod.accountRef || null,
          data.paymentMethod.details ? JSON.stringify(data.paymentMethod.details) : null,
        ]
      );
    }

    await tx.execute("DELETE FROM donors WHERE id = ?", [anomalousId]);
  });

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'donor_pool.anomalous.merged', 'donor', ?, 'INFO')`,
    [organizationId, user.id, user.email, String(targetId)]
  );

  return { merged: true, targetDonorId: targetId };
}

// ─── Reminders ──────────────────────────────────────────────────────────────

const REMINDER_CHANNELS = ["SMS", "WHATSAPP", "EMAIL"];

function assertLiveMessagingChannelConfigured(channel) {
  if (env.MESSAGE_PROVIDER !== "live") return;

  if (channel === "SMS" && (!env.AFRICAS_TALKING.username || !env.AFRICAS_TALKING.apiKey)) {
    throw ApiError.badRequest(
      "SMS reminders require Africa's Talking credentials (AT_USERNAME, AT_API_KEY). Configure them in your .env file or switch to EMAIL.",
      "SMS_NOT_CONFIGURED"
    );
  }
  if (channel === "WHATSAPP" && (!env.WHATSAPP.token || !env.WHATSAPP.phoneNumberId)) {
    throw ApiError.badRequest(
      "WhatsApp reminders require Meta WhatsApp Business credentials (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID). Configure them in your .env or switch to EMAIL.",
      "WHATSAPP_NOT_CONFIGURED"
    );
  }
  if (
    channel === "EMAIL" &&
    (!env.SMTP.host || !env.SMTP.user || !env.SMTP.password || !env.SMTP.fromEmail)
  ) {
    throw ApiError.badRequest(
      "Email reminders require SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL). Configure them in your .env file.",
      "EMAIL_NOT_CONFIGURED"
    );
  }
}

/**
 * One-off reminder where every donor is contacted on their own
 * `preferred_channel`. Donors whose preferred channel is not a messaging
 * channel (e.g. PHONE) or who lack a working contact for it fall back to
 * `data.fallbackChannel` (default SMS). Each channel that ends up being used
 * must have a saved template supplied in `data.templates`.
 */
async function sendPreferredChannelReminder({
  data,
  campaign,
  effectiveOrgId,
  orgName,
  campaignUrl,
  donors,
  user,
}) {
  const fallback = REMINDER_CHANNELS.includes(data.fallbackChannel)
    ? data.fallbackChannel
    : "SMS";
  const templateIds = data.templates || {};

  // Resolve the channel each donor will actually be messaged on. Keep
  // withdrawn donors and donors without a usable contact out of the batches,
  // so preferred-channel sends have the same consent guarantees as
  // single-channel sends.
  const routed = [];
  const skippedConsent = [];
  const skippedNoContact = [];
  for (const donor of donors) {
    if (donor.consent_status === "WITHDRAWN") {
      skippedConsent.push(donor);
      continue;
    }

    const preferred = REMINDER_CHANNELS.includes(donor.preferred_channel)
      ? donor.preferred_channel
      : fallback;
    let channel = preferred;
    if (!recipientFor(channel, donor) && channel !== fallback && recipientFor(fallback, donor)) {
      channel = fallback;
    }
    if (!recipientFor(channel, donor)) {
      skippedNoContact.push(donor);
      continue;
    }
    routed.push({ donor, channel });
  }

  if (routed.length === 0) {
    const reasons = [];
    if (skippedConsent.length > 0) reasons.push(`${skippedConsent.length} donor(s) have withdrawn consent`);
    if (skippedNoContact.length > 0) reasons.push("the remaining donors have no usable contact details");
    throw ApiError.badRequest(
      `No donors can receive reminders. ${reasons.join("; ") || "Check donor contact details."}`,
      "NO_ELIGIBLE_DONORS"
    );
  }

  const usedChannels = [...new Set(routed.map((r) => r.channel))];
  usedChannels.forEach(assertLiveMessagingChannelConfigured);
  const missing = usedChannels.filter((c) => !templateIds[c]);
  if (missing.length > 0) {
    throw ApiError.badRequest(
      `Pick a template for: ${missing.join(", ")}`,
      "TEMPLATE_REQUIRED"
    );
  }

  // Load every template referenced, and confirm the channel matches.
  const templatesByChannel = {};
  for (const channel of usedChannels) {
    const rows = await db.query(
      "SELECT * FROM message_templates WHERE id = ? AND organization_id = ?",
      [Number(templateIds[channel]), effectiveOrgId]
    );
    if (rows.length === 0) {
      throw ApiError.badRequest(`Template for ${channel} was not found`, "TEMPLATE_NOT_FOUND");
    }
    if (rows[0].channel !== channel) {
      throw ApiError.badRequest(
        `The template picked for ${channel} is a ${rows[0].channel} template`,
        "TEMPLATE_CHANNEL_MISMATCH"
      );
    }
    templatesByChannel[channel] = rows[0];
  }

  const batchIds = [];
  const allDeliveries = [];
  const failedDetails = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const channel of usedChannels) {
    const channelDonors = routed.filter((r) => r.channel === channel).map((r) => r.donor);
    const template = templatesByChannel[channel];

    const batchResult = await db.execute(
      `INSERT INTO message_batches
         (organization_id, campaign_id, created_by_id, type, subject, body, status, recipient_count)
       VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?)`,
      [
        effectiveOrgId,
        campaign.id,
        user.id,
        channel,
        template.subject || null,
        template.body,
        channelDonors.length,
      ]
    );
    const batchId = batchResult.insertId;
    batchIds.push(batchId);
    let channelSentCount = 0;

    for (const donor of channelDonors) {
      const donorName =
        [donor.first_name, donor.last_name].filter(Boolean).join(" ") || "Donor";
      const vars = { donorName, campaignName: campaign.name, orgName, amountDue: "" };
      const subject = renderTemplate(template.subject || `Reminder: ${campaign.name}`, vars);
      const bodyText = renderTemplate(template.body, vars);
      const recipient = recipientFor(channel, donor);

      let html = null;
      if (channel === "EMAIL" && recipient) {
        html = buildReminderEmailHtml({
          donorName,
          campaignName: campaign.name,
          campaignUrl,
          orgName,
          messageBody: bodyText,
        });
      }

      const result = recipient
        ? await sendMessage({ channel, to: recipient, subject, body: bodyText, html })
        : { status: "FAILED", providerRef: null, error: "Donor has no contact for this channel" };

      await db.execute(
        `INSERT INTO message_deliveries
           (batch_id, donor_id, recipient, status, provider_ref, error, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [batchId, donor.id, recipient || "", result.status, result.providerRef || null, result.error || null]
      );
      allDeliveries.push({
        donorId: donor.id,
        channel,
        recipient: recipient || "",
        status: result.status,
        providerRef: result.providerRef || null,
        error: result.error || null,
      });

      if (result.status === "FAILED") {
        failedCount++;
        failedDetails.push({
          donorId: donor.id,
          name: [donor.first_name, donor.last_name].filter(Boolean).join(" ") || "Donor",
          recipient,
          error: result.error || "Unknown error",
        });
      } else {
        sentCount++;
        channelSentCount++;
      }
    }

    await db.execute(
      "UPDATE message_batches SET recipient_count = ?, status = ? WHERE id = ?",
      [
        channelSentCount,
        channelSentCount === channelDonors.length
          ? "SENT"
          : channelSentCount > 0
            ? "PARTIAL"
            : "FAILED",
        batchId,
      ]
    );

    await db.execute(
      `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
       VALUES (?, ?, ?, 'reminder.sent', 'message_batch', ?, 'INFO')`,
      [effectiveOrgId, user.id, user.email, String(batchId)]
    );
  }

  if (sentCount === 0 && failedCount > 0) {
    for (const batchId of batchIds) {
      await db.execute("DELETE FROM message_deliveries WHERE batch_id = ?", [batchId]);
      await db.execute("DELETE FROM message_batches WHERE id = ?", [batchId]);
    }
    const firstError = failedDetails[0]?.error || "Sending failed";
    throw ApiError.badRequest(
      `None of the ${failedCount} reminder(s) could be delivered. ${firstError}${failedCount > 1 ? ` (and ${failedCount - 1} more)` : ""}`,
      "ALL_DELIVERIES_FAILED"
    );
  }

  return {
    batch: {
      id: batchIds[0] ?? null,
      campaignId: campaign.id,
      channel: "PREFERRED",
      channels: usedChannels,
      recipientCount: sentCount,
      skippedCount: skippedConsent.length + skippedNoContact.length,
      failedCount,
    },
    deliveries: allDeliveries,
    skipped: [
      ...skippedConsent.map((d) => ({
        donorId: d.id,
        name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "Donor",
        reason: "consent withdrawn",
      })),
      ...skippedNoContact.map((d) => ({
        donorId: d.id,
        name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "Donor",
        reason: "no usable contact details",
      })),
    ],
    failedDetails,
  };
}

async function sendReminder(organizationId, user, data) {
  // SUPER_ADMIN has no organization_id — look up campaign by ID only
  let campaign;
  if (organizationId) {
    const rows = await db.query(
      "SELECT id, name, slug, organization_id FROM campaigns WHERE id = ? AND organization_id = ?",
      [data.campaignId, organizationId]
    );
    campaign = rows[0];
  } else {
    const rows = await db.query(
      "SELECT id, name, slug, organization_id FROM campaigns WHERE id = ?",
      [data.campaignId]
    );
    campaign = rows[0];
  }
  if (!campaign) throw ApiError.notFound("Campaign not found");

  // Derive effective org_id from the campaign (works for SUPER_ADMIN too)
  const effectiveOrgId = organizationId || campaign.organization_id;

  // Fetch organization name for email branding
  const orgRows = await db.query("SELECT name FROM organizations WHERE id = ?", [effectiveOrgId]);
  const orgName = orgRows[0]?.name || "Changia";

  const donorIds = data.donorIds.map(Number);
  const donors = await db.query(
    `SELECT id, first_name, last_name, email, phone, preferred_channel, consent_status
     FROM donors
     WHERE id IN (?) AND organization_id = ?`,
    [donorIds, effectiveOrgId]
  );
  if (donors.length === 0) {
    throw ApiError.badRequest("No valid donors selected for the reminder");
  }

  // Preferred-channel sends must be routed before single-channel filtering;
  // their request intentionally has no `channel` or `message`.
  if (data.usePreferredChannel) {
    return sendPreferredChannelReminder({
      data,
      campaign,
      effectiveOrgId,
      orgName,
      campaignUrl: `${env.APP_BASE_URL}/campaigns/${campaign.slug || campaign.id}`,
      donors,
      user,
    });
  }

  // Fail fast when the selected live provider is not configured. This gives
  // the donor-board dialog a useful error instead of an empty-looking send.
  assertLiveMessagingChannelConfigured(data.channel);

  // Filter out donors who can't receive this channel's message:
  //   - WITHDRAWN consent → skip
  //   - No valid contact for the channel → skip
  const eligibleDonors = [];
  const skippedNoContact = [];
  const skippedConsent = [];
  for (const donor of donors) {
    if (donor.consent_status === "WITHDRAWN") {
      skippedConsent.push(donor);
      continue;
    }
    const contact = recipientFor(data.channel, donor);
    if (!contact) {
      skippedNoContact.push(donor);
      continue;
    }
    eligibleDonors.push({ ...donor, _recipient: contact });
  }

  if (eligibleDonors.length === 0) {
    const reasons = [];
    if (skippedConsent.length > 0) reasons.push(`${skippedConsent.length} donor(s) have withdrawn consent`);
    if (skippedNoContact.length > 0) reasons.push(`${skippedNoContact.length} donor(s) have no ${data.channel === "EMAIL" ? "email" : "phone number"}`);
    throw ApiError.badRequest(
      `No donors can receive ${data.channel} reminders. ${reasons.join("; ") || "Check that donors have a valid contact for the chosen channel."}`,
      "NO_ELIGIBLE_DONORS"
    );
  }

  const subject = data.subject || `Reminder: ${campaign.name}`;
  const body = data.message;

  // Build campaign URL for email channel
  const campaignUrl = `${env.APP_BASE_URL}/campaigns/${campaign.slug || campaign.id}`;

  // ─── Preferred-channel mode ──────────────────────────────────────────────
  // Each donor is messaged on their own preferred_channel (falling back to
  // `fallbackChannel` when that channel can't be used), rendered from a
  // per-channel saved template.
  if (data.usePreferredChannel) {
    return sendPreferredChannelReminder({
      data,
      campaign,
      effectiveOrgId,
      orgName,
      campaignUrl,
      donors,
      user,
    });
  }

  const batchResult = await db.execute(
    `INSERT INTO message_batches
       (organization_id, campaign_id, created_by_id, type, subject, body, status, recipient_count)
     VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?)`,
    [effectiveOrgId, data.campaignId, user.id, data.channel, subject, body, eligibleDonors.length]
  );
  const batchId = batchResult.insertId;

  let sentCount = 0;
  let failedCount = 0;
  const failedDetails = [];

  for (const donor of eligibleDonors) {
    const recipient = donor._recipient;

    // Build HTML email for EMAIL channel with campaign link
    let html = null;
    if (data.channel === "EMAIL") {
      const donorName = [donor.first_name, donor.last_name].filter(Boolean).join(" ") || "Donor";
      html = buildReminderEmailHtml({
        donorName,
        campaignName: campaign.name,
        campaignUrl,
        orgName,
        messageBody: body,
      });
    }

    const result = await sendMessage({
      channel: data.channel,
      to: recipient,
      subject,
      body,
      html,
    });
    await db.execute(
      `INSERT INTO message_deliveries
         (batch_id, donor_id, recipient, status, provider_ref, error, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [batchId, donor.id, recipient, result.status, result.providerRef, result.error || null]
    );

    if (result.status === "FAILED") {
      failedCount++;
      failedDetails.push({
        donorId: donor.id,
        name: [donor.first_name, donor.last_name].filter(Boolean).join(" ") || "Donor",
        recipient,
        error: result.error || "Unknown error",
      });
    } else {
      sentCount++;
    }
  }

  // Update the batch with the actual sent count
  await db.execute(
    "UPDATE message_batches SET recipient_count = ? WHERE id = ?",
    [sentCount, batchId]
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'reminder.sent', 'message_batch', ?, ?)`,
    [effectiveOrgId, user.id, user.email, String(batchId), sentCount > 0 ? "INFO" : "WARNING"]
  );

  // If nothing was actually sent, clean up the batch and report clearly
  if (sentCount === 0 && failedCount > 0) {
    await db.execute("DELETE FROM message_deliveries WHERE batch_id = ?", [batchId]);
    await db.execute("DELETE FROM message_batches WHERE id = ?", [batchId]);
    const firstError = failedDetails[0]?.error || "Sending failed";
    throw ApiError.badRequest(
      `None of the ${failedCount} reminder(s) could be delivered. ${firstError}${failedCount > 1 ? ` (and ${failedCount - 1} more)` : ""}`,
      "ALL_DELIVERIES_FAILED"
    );
  }

  const deliveries = await db.query(
    "SELECT id, donor_id, recipient, status, provider_ref, error, sent_at FROM message_deliveries WHERE batch_id = ?",
    [batchId]
  );

  return {
    batch: {
      id: batchId,
      campaignId: data.campaignId,
      channel: data.channel,
      subject,
      body,
      recipientCount: sentCount,
      skippedCount: skippedConsent.length + skippedNoContact.length,
      failedCount,
    },
    deliveries: deliveries.map((d) => ({
      id: d.id,
      donorId: d.donor_id,
      recipient: d.recipient,
      status: d.status,
      providerRef: d.provider_ref,
      error: d.error || null,
      sentAt: d.sent_at,
    })),
    skipped: [
      ...skippedConsent.map((d) => ({
        donorId: d.id,
        name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "Donor",
        reason: "consent withdrawn",
      })),
      ...skippedNoContact.map((d) => ({
        donorId: d.id,
        name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "Donor",
        reason: `no ${data.channel === "EMAIL" ? "email" : "phone number"}`,
      })),
    ],
    failedDetails,
  };
}

module.exports = {
  listPools,
  createPool,
  getPool,
  updatePool,
  deletePool,
  addMembers,
  setMemberExpected,
  removeMember,
  listDuplicateGroups,
  resolveDuplicates,
  getAnomalousPool,
  ensureAnomalousPool,
  ensureAnomalousPoolMember,
  mergeAnomalous,
  sendReminder,
  isAdminRole,
  computeStatus,
};
