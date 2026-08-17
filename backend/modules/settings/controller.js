const { asyncHandler } = require("../../utils/asyncHandler");
const db = require("../../db");
const service = require("./service");

const getOrg = asyncHandler(async (req, res) => res.json({ success: true, data: await service.getOrgSettings(req.user.organizationId) }));
const getMySettings = asyncHandler(async (req, res) => {
  const organization = req.user.organizationId
    ? await service.getOrgSettings(req.user.organizationId)
    : null;
  res.json({ success: true, data: { user: { id: req.user.id, email: req.user.email, role: req.user.role }, organization } });
});
const updateOrg = asyncHandler(async (req, res) => {
  const settings = await service.updateOrgSettings(req.user.organizationId, req.body);
  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'settings.organization.updated', 'organization', ?, 'INFO')`,
    [req.user.organizationId, req.user.id, req.user.email, String(req.user.organizationId)]
  );
  res.json({ success: true, data: settings });
});
module.exports = { getOrg, updateOrg, getMySettings };
