const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");

const DEFAULTS = {
  registrationNumber: null,
  defaultChannel: "SMS",
  language: "en",
  timezone: "eat",
  dateFormat: "dmy",
  notifications: { notifyOnDonation: true, notifyOnCampaignStatus: true, notifyOnUserInvite: true },
  security: { twoFactorEnabled: false, loginAlerts: true },
};

function parseJson(value, fallback) {
  if (!value) return fallback;
  try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return fallback; }
}

async function getOrgSettings(organizationId) {
  const orgs = await db.query(
    `SELECT o.name, o.email, o.phone, o.description, o.logo_url, o.currency, os.registration_number,
            os.default_channel, os.language, os.timezone, os.date_format, os.notifications, os.security
     FROM organizations o LEFT JOIN organization_settings os ON os.organization_id = o.id
     WHERE o.id = ?`,
    [organizationId]
  );
  if (!orgs[0]) throw ApiError.notFound("Organization not found");
  const row = orgs[0];
  return {
    orgName: row.name,
    brandName: row.name,
    logoUrl: row.logo_url,
    registrationNumber: row.registration_number || DEFAULTS.registrationNumber,
    primaryEmail: row.email,
    phone: row.phone,
    description: row.description,
    defaultChannel: row.default_channel || DEFAULTS.defaultChannel,
    currency: row.currency || "TZS",
    language: row.language || DEFAULTS.language,
    timezone: row.timezone || DEFAULTS.timezone,
    dateFormat: row.date_format || DEFAULTS.dateFormat,
    notifications: parseJson(row.notifications, DEFAULTS.notifications),
    security: parseJson(row.security, DEFAULTS.security),
  };
}

async function updateOrgSettings(organizationId, data) {
  const orgFields = [];
  const orgValues = [];
  const aliases = { orgName: "name", primaryEmail: "email", phone: "phone", description: "description", logoUrl: "logo_url", currency: "currency" };
  for (const [input, column] of Object.entries(aliases)) {
    if (data[input] !== undefined) { orgFields.push(`${column} = ?`); orgValues.push(data[input] || null); }
  }
  if (orgFields.length) {
    orgValues.push(organizationId);
    await db.execute(`UPDATE organizations SET ${orgFields.join(", ")} WHERE id = ?`, orgValues);
  }

  const settingsFields = ["organization_id"];
  const settingsValues = [organizationId];
  const update = [];
  const aliases2 = {
    registrationNumber: "registration_number", defaultChannel: "default_channel", language: "language",
    timezone: "timezone", dateFormat: "date_format",
  };
  for (const [input, column] of Object.entries(aliases2)) {
    if (data[input] !== undefined) { settingsFields.push(column); settingsValues.push(data[input]); update.push(`${column} = VALUES(${column})`); }
  }
  for (const key of ["notifications", "security"]) {
    if (data[key] !== undefined) { settingsFields.push(key); settingsValues.push(JSON.stringify(data[key])); update.push(`${key} = VALUES(${key})`); }
  }
  if (update.length) {
    await db.execute(
      `INSERT INTO organization_settings (${settingsFields.join(", ")}) VALUES (${settingsFields.map(() => "?").join(", ")})
       ON DUPLICATE KEY UPDATE ${update.join(", ")}`,
      settingsValues
    );
  }
  return getOrgSettings(organizationId);
}

module.exports = { getOrgSettings, updateOrgSettings };
