const { asyncHandler } = require("../../utils/asyncHandler");
const auditService = require("./service");

const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditService.listAuditLogs(req.user.organizationId, req.query);
  res.status(200).json({ success: true, data: result });
});

const recentActivity = asyncHandler(async (req, res) => {
  const activity = await auditService.recentActivity(req.user.organizationId);
  res.status(200).json({ success: true, data: activity });
});

module.exports = { listAuditLogs, recentActivity };
