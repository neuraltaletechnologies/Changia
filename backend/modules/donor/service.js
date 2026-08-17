const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { normalizePhone } = require("../../utils/phone");

function parseTags(tags) {
  if (!tags) return [];
  try {
    const parsed = typeof tags === "string" ? JSON.parse(tags) : tags;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function num(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function serializeDonor(d, opts = {}) {
  return {
    id: d.id,
    firstName: d.first_name,
    lastName: d.last_name,
    email: d.email,
    phone: d.phone,
    location: d.location,
    gender: d.gender,
    position: d.position,
    status: d.status,
    consentStatus: d.consent_status,
    preferredChannel: d.preferred_channel,
    isAnomalous: Boolean(d.is_anomalous),
    tags: parseTags(d.tags),
    notes: d.notes,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    totalPaid: num(d.total_paid ?? d.donation_total),
    donationCount: d.donation_count || 0,
    paymentMethods: opts.paymentMethods || [],
  };
}

async function loadPaymentMethods(donorId) {
  const rows = await db.query(
    `SELECT id, method, account_ref, details, is_primary, created_at
     FROM donor_payment_methods WHERE donor_id = ? ORDER BY created_at DESC`,
    [donorId]
  );
  return rows.map((m) => ({
    id: m.id,
    method: m.method,
    accountRef: m.account_ref,
    details: m.details,
    isPrimary: Boolean(m.is_primary),
    createdAt: m.created_at,
  }));
}

async function assertPoolAddable(organizationId, user, poolId) {
  const pools = await db.query(
    "SELECT * FROM donor_pools WHERE id = ? AND organization_id = ?",
    [poolId, organizationId]
  );
  if (pools.length === 0) throw ApiError.notFound("Donor pool not found");
  const pool = pools[0];
  const isAdmin = user && (user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN");
  if (pool.is_system === 1 && !isAdmin) {
    throw ApiError.badRequest("Use the merge flow to manage the anomalous pool", "SYSTEM_POOL");
  }
  if (!isAdmin && Number(pool.created_by_id) !== user.id) {
    throw ApiError.forbidden("You can only add donors to your own pools", "POOL_ACCESS_DENIED");
  }
}

async function listDonors(organizationId, filters, user) {
  const where = ["d.organization_id = ?"];
  const values = [organizationId];

  if (filters.anomalous === "true") {
    where.push("d.is_anomalous = 1");
  } else if (filters.anomalous === "false") {
    where.push("d.is_anomalous = 0");
  } else {
    where.push("d.is_anomalous = 0");
  }

  if (filters.search) {
    where.push(
      "(d.first_name LIKE ? OR d.last_name LIKE ? OR d.email LIKE ? OR d.phone LIKE ? OR d.position LIKE ?)"
    );
    const like = `%${filters.search}%`;
    values.push(like, like, like, like, like);
  }
  if (filters.status) {
    where.push("d.status = ?");
    values.push(filters.status);
  }
  if (filters.consent) {
    where.push("d.consent_status = ?");
    values.push(filters.consent);
  }
  if (filters.gender) {
    where.push("d.gender = ?");
    values.push(filters.gender);
  }
  if (filters.poolId) {
    where.push(
      "d.id IN (SELECT dpm.donor_id FROM donor_pool_members dpm WHERE dpm.pool_id = ?)"
    );
    values.push(filters.poolId);
  }

  const sortColumn = {
    name: "d.first_name",
    created: "d.created_at",
    total: "total_paid",
  }[filters.sortBy || "created"];

  const sortDir = filters.sortDir === "asc" ? "ASC" : "DESC";

  const whereSql = where.join(" AND ");
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;

  const donors = await db.query(
    `SELECT d.*,
       (SELECT COUNT(*) FROM donations dd WHERE dd.donor_id = d.id AND dd.status = 'CONFIRMED') AS donation_count,
       (SELECT COALESCE(SUM(dd.amount),0) FROM donations dd WHERE dd.donor_id = d.id AND dd.status = 'CONFIRMED') AS total_paid
     FROM donors d
     WHERE ${whereSql}
     ORDER BY ${sortColumn} ${sortDir}, d.id DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM donors d WHERE ${whereSql}`, values)
    .then((rows) => [rows]);

  return {
    donors: donors.map((d) => serializeDonor(d)),
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
}

async function getDonor(organizationId, donorId) {
  const donors = await db.query(
    `SELECT d.*,
       (SELECT COUNT(*) FROM donations dd WHERE dd.donor_id = d.id AND dd.status = 'CONFIRMED') AS donation_count,
       (SELECT COALESCE(SUM(dd.amount),0) FROM donations dd WHERE dd.donor_id = d.id AND dd.status = 'CONFIRMED') AS total_paid
     FROM donors d WHERE d.id = ? AND d.organization_id = ?`,
    [donorId, organizationId]
  );
  const donor = donors[0];
  if (!donor) throw ApiError.notFound("Donor not found");

  const [consents, donations, paymentMethods, pools] = await Promise.all([
    db.query(
      `SELECT id, channel, status, source, granted_at, revoked_at
       FROM consents WHERE donor_id = ?`,
      [donorId]
    ),
    db.query(
      `SELECT d.id, d.amount, d.status, d.method, d.receipt_number, d.created_at,
              c.name AS campaign_name
       FROM donations d
       JOIN campaigns c ON c.id = d.campaign_id
       WHERE d.donor_id = ?
       ORDER BY d.created_at DESC LIMIT 50`,
      [donorId]
    ),
    loadPaymentMethods(donorId),
    db.query(
      `SELECT p.id, p.name, p.category, p.is_system
       FROM donor_pool_members dpm
       JOIN donor_pools p ON p.id = dpm.pool_id
       WHERE dpm.donor_id = ?
       ORDER BY p.created_at`,
      [donorId]
    ),
  ]);

  return {
    ...serializeDonor(donor, { paymentMethods }),
    pools: pools.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      isSystem: Boolean(p.is_system),
    })),
    consents: consents.map((c) => ({
      id: c.id,
      channel: c.channel,
      status: c.status,
      source: c.source,
      grantedAt: c.granted_at,
      revokedAt: c.revoked_at,
    })),
    donations: donations.map((d) => ({
      id: d.id,
      amount: Number(d.amount),
      status: d.status,
      method: d.method,
      receiptNumber: d.receipt_number,
      createdAt: d.created_at,
      campaign: { name: d.campaign_name },
    })),
  };
}

async function createDonor(organizationId, data, user) {
  const phone = normalizePhone(data.phone);

  const existing = await db.query(
    "SELECT id FROM donors WHERE organization_id = ? AND phone = ?",
    [organizationId, phone]
  );
  if (existing.length > 0) {
    throw ApiError.conflict("A donor with this phone number already exists", "DONOR_EXISTS");
  }

  const tags = data.tags ? JSON.stringify(data.tags) : null;
  const consentStatus = data.consentStatus || "PENDING";
  const preferredChannel = data.preferredChannel || "SMS";

  const result = await db.execute(
    `INSERT INTO donors
       (organization_id, first_name, last_name, email, phone, location, gender,
        position, status, consent_status, preferred_channel, is_anomalous, tags, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      organizationId,
      data.firstName || null,
      data.lastName || null,
      data.email ? data.email.toLowerCase() : null,
      phone,
      data.location || null,
      data.gender || null,
      data.position || null,
      data.status || "PROSPECT",
      consentStatus,
      preferredChannel,
      tags,
      data.notes || null,
    ]
  );
  const donorId = result.insertId;

  // Record per-channel consent if provided
  if (consentStatus === "CONSENTED") {
    await db.execute(
      `INSERT IGNORE INTO consents (donor_id, channel, status, source, granted_at)
       VALUES (?, ?, 'CONSENTED', 'manual', NOW())`,
      [donorId, preferredChannel]
    );
  }

  // Optional payment methods captured at creation
  if (data.paymentMethods && data.paymentMethods.length > 0) {
    for (const pm of data.paymentMethods) {
      await db.execute(
        `INSERT INTO donor_payment_methods
           (donor_id, organization_id, method, account_ref, details, is_primary)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [
          donorId,
          organizationId,
          pm.method,
          pm.accountRef || null,
          pm.details ? JSON.stringify(pm.details) : null,
        ]
      );
    }
  }

  // Optionally drop the new donor straight into a pool
  if (data.poolId) {
    await assertPoolAddable(organizationId, user, data.poolId);
    await db.execute(
      `INSERT IGNORE INTO donor_pool_members (pool_id, donor_id, added_by_id)
       VALUES (?, ?, ?)`,
      [data.poolId, donorId, user ? user.id : null]
    );
  }

  return getDonor(organizationId, donorId);
}

async function importDonors(organizationId, user, data) {
  const created = [];
  const skipped = [];
  for (const donor of data.donors) {
    try {
      created.push(await createDonor(organizationId, donor, user));
    } catch (error) {
      if (data.skipDuplicates && error.code === "DONOR_EXISTS") {
        skipped.push({ phone: normalizePhone(donor.phone), reason: "DONOR_EXISTS" });
      } else {
        throw error;
      }
    }
  }
  return { created, skipped, createdCount: created.length, skippedCount: skipped.length };
}

async function updateDonor(organizationId, donorId, data) {
  const existing = await db.query(
    "SELECT * FROM donors WHERE id = ? AND organization_id = ?",
    [donorId, organizationId]
  );
  const donor = existing[0];
  if (!donor) throw ApiError.notFound("Donor not found");

  const fields = [];
  const values = [];
  if (data.firstName !== undefined) { fields.push("first_name = ?"); values.push(data.firstName); }
  if (data.lastName !== undefined) { fields.push("last_name = ?"); values.push(data.lastName); }
  if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email ? data.email.toLowerCase() : null); }
  if (data.phone !== undefined) { fields.push("phone = ?"); values.push(normalizePhone(data.phone)); }
  if (data.location !== undefined) { fields.push("location = ?"); values.push(data.location); }
  if (data.gender !== undefined) { fields.push("gender = ?"); values.push(data.gender); }
  if (data.position !== undefined) { fields.push("position = ?"); values.push(data.position); }
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
  if (data.consentStatus !== undefined) { fields.push("consent_status = ?"); values.push(data.consentStatus); }
  if (data.preferredChannel !== undefined) { fields.push("preferred_channel = ?"); values.push(data.preferredChannel); }
  if (data.tags !== undefined) { fields.push("tags = ?"); values.push(JSON.stringify(data.tags)); }
  if (data.notes !== undefined) { fields.push("notes = ?"); values.push(data.notes); }

  if (fields.length > 0) {
    values.push(donorId);
    await db.execute(`UPDATE donors SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  // Sync consent records when consent status changes
  const channel = data.preferredChannel || donor.preferred_channel;
  if (data.consentStatus === "CONSENTED" && channel) {
    await db.execute(
      `INSERT INTO consents (donor_id, channel, status, source, granted_at)
       VALUES (?, ?, 'CONSENTED', 'manual', NOW())
       ON DUPLICATE KEY UPDATE status = 'CONSENTED', granted_at = NOW(), revoked_at = NULL`,
      [donorId, channel]
    );
  } else if (data.consentStatus === "WITHDRAWN") {
    await db.execute(
      `UPDATE consents SET status = 'WITHDRAWN', revoked_at = NOW() WHERE donor_id = ?`,
      [donorId]
    );
  }

  if (data.paymentMethods && data.paymentMethods.length > 0) {
    for (const pm of data.paymentMethods) {
      await db.execute(
        `INSERT INTO donor_payment_methods
           (donor_id, organization_id, method, account_ref, details, is_primary)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [
          donorId,
          organizationId,
          pm.method,
          pm.accountRef || null,
          pm.details ? JSON.stringify(pm.details) : null,
        ]
      );
    }
  }

  return getDonor(organizationId, donorId);
}

async function deleteDonor(organizationId, donorId) {
  const existing = await db.query(
    "SELECT id FROM donors WHERE id = ? AND organization_id = ?",
    [donorId, organizationId]
  );
  if (existing.length === 0) throw ApiError.notFound("Donor not found");
  await db.execute("DELETE FROM donors WHERE id = ?", [donorId]);
}

async function addPaymentMethod(organizationId, donorId, data) {
  const existing = await db.query(
    "SELECT id FROM donors WHERE id = ? AND organization_id = ? AND is_anomalous = 0",
    [donorId, organizationId]
  );
  if (existing.length === 0) throw ApiError.notFound("Known donor not found");

  const result = await db.execute(
    `INSERT INTO donor_payment_methods
       (donor_id, organization_id, method, account_ref, details, is_primary)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [
      donorId,
      organizationId,
      data.method,
      data.accountRef || null,
      data.details ? JSON.stringify(data.details) : null,
    ]
  );

  return loadPaymentMethods(donorId);
}

async function removePaymentMethod(organizationId, donorId, methodId) {
  await db.query(
    `DELETE pm FROM donor_payment_methods pm
     JOIN donors d ON d.id = pm.donor_id
     WHERE pm.id = ? AND pm.donor_id = ? AND d.organization_id = ?`,
    [methodId, donorId, organizationId]
  );
  return loadPaymentMethods(donorId);
}

module.exports = {
  listDonors,
  getDonor,
  createDonor,
  importDonors,
  updateDonor,
  deleteDonor,
  addPaymentMethod,
  removePaymentMethod,
};
