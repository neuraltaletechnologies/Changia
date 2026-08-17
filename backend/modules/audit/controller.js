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

const exportAuditLogs = asyncHandler(async (req, res) => {
  const logs = await auditService.exportAuditLogs(req.user.organizationId, req.query);
  const esc = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["id", "action", "resource", "resourceId", "actorEmail", "severity", "createdAt"],
    ...logs.map((log) => [log.id, log.action, log.resource, log.resourceId, log.actorEmail, log.severity, log.createdAt]),
  ];
  res.type("text/csv").attachment("audit-logs.csv").send(rows.map((row) => row.map(esc).join(",")).join("\n"));
});

module.exports = { listAuditLogs, recentActivity, exportAuditLogs };
