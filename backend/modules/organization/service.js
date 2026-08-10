const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { normalizePhone } = require("../../utils/phone");

async function getOrganization(organizationId) {
  const orgs = await db.query(
    `SELECT id, name, slug, email, phone, address, description, logo_url, currency, status, created_at
     FROM organizations WHERE id = ?`,
    [organizationId]
  );
  const organization = orgs[0];
  if (!organization) throw ApiError.notFound("Organization not found");

  const [[counts]] = await db
    .query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE organization_id = ?) AS users,
         (SELECT COUNT(*) FROM campaigns WHERE organization_id = ?) AS campaigns,
         (SELECT COUNT(*) FROM donors WHERE organization_id = ?) AS donors`,
      [organizationId, organizationId, organizationId]
    )
    .then((rows) => [rows]);

  return { ...organization, _count: counts };
}

async function updateOrganization(organizationId, data) {
  const existing = await db.query("SELECT id FROM organizations WHERE id = ?", [organizationId]);
  if (existing.length === 0) throw ApiError.notFound("Organization not found");

  const fields = [];
  const values = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email); }
  if (data.phone !== undefined) { fields.push("phone = ?"); values.push(normalizePhone(data.phone)); }
  if (data.address !== undefined) { fields.push("address = ?"); values.push(data.address); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.logoUrl !== undefined) { fields.push("logo_url = ?"); values.push(data.logoUrl || null); }

  if (fields.length === 0) {
    return getOrganization(organizationId);
  }

  values.push(organizationId);
  await db.execute(
    `UPDATE organizations SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
  return getOrganization(organizationId);
}

async function getOrganizationStats(organizationId) {
  const [[stats]] = await db
    .query(
      `SELECT
         COALESCE(SUM(d.amount), 0) AS total_raised,
         COUNT(d.id) AS total_donations,
         (SELECT COUNT(*) FROM campaigns WHERE organization_id = ? AND status = 'ACTIVE') AS active_campaigns,
         (SELECT COUNT(*) FROM users WHERE organization_id = ?) AS team_size,
         (SELECT COUNT(*) FROM donors WHERE organization_id = ?) AS donor_count,
         (SELECT COUNT(*) FROM campaigns WHERE organization_id = ?) AS campaign_count
       FROM donations d
       WHERE d.organization_id = ? AND d.status = 'CONFIRMED'`,
      [organizationId, organizationId, organizationId, organizationId, organizationId]
    )
    .then((rows) => [rows]);

  const org = await db.query("SELECT id FROM organizations WHERE id = ?", [organizationId]);
  if (org.length === 0) throw ApiError.notFound("Organization not found");

  return {
    totalRaised: Number(stats.total_raised || 0),
    totalDonations: Number(stats.total_donations || 0),
    activeCampaigns: Number(stats.active_campaigns || 0),
    teamSize: Number(stats.team_size || 0),
    donorCount: Number(stats.donor_count || 0),
    campaignCount: Number(stats.campaign_count || 0),
  };
}

module.exports = { getOrganization, updateOrganization, getOrganizationStats };
