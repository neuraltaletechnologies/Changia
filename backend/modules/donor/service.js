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

function serializeDonor(d) {
  return {
    id: d.id,
    firstName: d.first_name,
    lastName: d.last_name,
    email: d.email,
    phone: d.phone,
    location: d.location,
    status: d.status,
    consentStatus: d.consent_status,
    preferredChannel: d.preferred_channel,
    tags: parseTags(d.tags),
    notes: d.notes,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    donationCount: d.donation_count || 0,
  };
}

async function listDonors(organizationId, filters) {
  const where = ["organization_id = ?"];
  const values = [organizationId];

  if (filters.search) {
    where.push(
      "(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)"
    );
    const like = `%${filters.search}%`;
    values.push(like, like, like, like);
  }
  if (filters.status) {
    where.push("status = ?");
    values.push(filters.status);
  }
  if (filters.consent) {
    where.push("consent_status = ?");
    values.push(filters.consent);
  }

  const whereSql = where.join(" AND ");
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;

  const donors = await db.query(
    `SELECT d.*, (SELECT COUNT(*) FROM donations dd WHERE dd.donor_id = d.id) AS donation_count
     FROM donors d
     WHERE ${whereSql}
     ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM donors WHERE ${whereSql}`, values)
    .then((rows) => [rows]);

  return {
    donors: donors.map(serializeDonor),
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
    `SELECT d.*, (SELECT COUNT(*) FROM donations dd WHERE dd.donor_id = d.id) AS donation_count
     FROM donors d WHERE d.id = ? AND d.organization_id = ?`,
    [donorId, organizationId]
  );
  const donor = donors[0];
  if (!donor) throw ApiError.notFound("Donor not found");

  const [consents, donations] = await Promise.all([
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
       ORDER BY d.created_at DESC LIMIT 20`,
      [donorId]
    ),
  ]);

  return {
    ...serializeDonor(donor),
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

async function createDonor(organizationId, data) {
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
       (organization_id, first_name, last_name, email, phone, location, status,
        consent_status, preferred_channel, tags, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      organizationId,
      data.firstName || null,
      data.lastName || null,
      data.email ? data.email.toLowerCase() : null,
      phone,
      data.location || null,
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

  return getDonor(organizationId, donorId);
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

module.exports = { listDonors, getDonor, createDonor, updateDonor, deleteDonor };
