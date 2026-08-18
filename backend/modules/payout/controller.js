const { asyncHandler } = require("../../utils/asyncHandler");
const db = require("../../db");
const service = require("./service");

function audit(req, action, id) {
  return db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, ?, 'payout', ?, 'INFO')`,
    [req.user.organizationId, req.user.id, req.user.email, action, String(id)]
  );
}

const list = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listPayouts(req.user.organizationId, req.query, req.user) }));
const get = asyncHandler(async (req, res) => res.json({ success: true, data: await service.getPayout(req.user.organizationId, req.params.id, req.user) }));
const create = asyncHandler(async (req, res) => {
  const payout = await service.createPayout(req.user.organizationId, req.user, req.body);
  await audit(req, "payout.requested", payout.id);
  res.status(201).json({ success: true, data: payout });
});
const approve = asyncHandler(async (req, res) => {
  const payout = await service.decidePayout(req.user.organizationId, req.user, req.params.id, true, req.body);
  await audit(req, "payout.approved", payout.id);
  res.json({ success: true, data: payout });
});
const reject = asyncHandler(async (req, res) => {
  const payout = await service.decidePayout(req.user.organizationId, req.user, req.params.id, false, req.body);
  await audit(req, "payout.rejected", payout.id);
  res.json({ success: true, data: payout });
});
const markPaid = asyncHandler(async (req, res) => {
  const payout = await service.markPaid(req.user.organizationId, req.params.id, req.body);
  await audit(req, "payout.paid", payout.id);
  res.json({ success: true, data: payout });
});

module.exports = { list, get, create, approve, reject, markPaid };
