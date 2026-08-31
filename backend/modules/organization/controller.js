const { asyncHandler } = require("../../utils/asyncHandler");
const db = require("../../db");
const organizationService = require("./service");

const getMyOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.getOrganization(req.user.organizationId);
  res.status(200).json({ success: true, data: organization });
});

const updateMyOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.updateOrganization(
    req.user.organizationId,
    req.body
  );
  res.status(200).json({ success: true, data: organization });
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await organizationService.getOrganizationStats(req.user.organizationId);
  res.status(200).json({ success: true, data: stats });
});

const listOrganizations = asyncHandler(async (req, res) => {
  const organizations = await organizationService.listOrganizations();
  res.status(200).json({ success: true, data: { organizations } });
});

const createOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.createOrganization(req.body);
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'organization.created', 'organization', ?, 'INFO')`,
    [organization.id, req.user.id, req.user.email, String(organization.id)]
  );
  res.status(201).json({ success: true, data: organization });
});

module.exports = {
  getMyOrganization,
  updateMyOrganization,
  getStats,
  listOrganizations,
  createOrganization,
};
