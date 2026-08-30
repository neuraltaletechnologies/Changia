const { asyncHandler } = require("../../utils/asyncHandler");
const db = require("../../db");
const service = require("./service");

function audit(req, action, payout, severity = "INFO", details) {
  return db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, details, severity)
     VALUES (?, ?, ?, ?, 'payout', ?, ?, ?)`,
    [
      payout.organizationId ?? req.user.organizationId ?? null,
      req.user.id,
      req.user.email,
      action,
      String(payout.id),
      details ? JSON.stringify(details) : null,
      severity,
    ]
  );
}

const list = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listPayouts(req.user.organizationId, req.query, req.user) }));
const get = asyncHandler(async (req, res) => res.json({ success: true, data: await service.getPayout(req.user.organizationId, req.params.id, req.user) }));
const getHistory = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.getPayoutHistory(req.user.organizationId, req.params.id, req.user),
  })
);
const create = asyncHandler(async (req, res) => {
  const payout = await service.createPayout(req.user.organizationId, req.user, req.body);
  await audit(req, "payout.requested", payout, "INFO", {
    amount: payout.amount,
    notes: payout.reason || undefined,
  });
  res.status(201).json({ success: true, data: payout });
});
const approve = asyncHandler(async (req, res) => {
  const payout = await service.decidePayout(req.user.organizationId, req.user, req.params.id, true, req.body);
  // REVIEWED means stage 1 just happened; APPROVED means stage 2.
  await audit(
    req,
    payout.status === "REVIEWED" ? "payout.first_approved" : "payout.approved",
    payout,
    "INFO",
    req.body?.notes ? { notes: req.body.notes } : undefined
  );
  res.json({ success: true, data: payout });
});
const reject = asyncHandler(async (req, res) => {
  const payout = await service.decidePayout(req.user.organizationId, req.user, req.params.id, false, req.body);
  await audit(req, "payout.rejected", payout, "WARNING", req.body?.notes ? { notes: req.body.notes } : undefined);
  res.json({ success: true, data: payout });
});

/**
 * Preview the ClickPesa payout — shows fee breakdown before confirmation.
 * POST /payouts/:id/preview
 */
const preview = asyncHandler(async (req, res) => {
  const preview = await service.previewPayout(
    req.user.organizationId,
    req.params.id,
    req.body.phoneNumber,
    req.user
  );
  res.json({ success: true, data: preview });
});

/**
 * Mark payout as paid and initiate ClickPesa transfer if enabled.
 * POST /payouts/:id/paid
 */
const markPaid = asyncHandler(async (req, res) => {
  const payout = await service.markPaid(req.user.organizationId, req.params.id, req.body, req.user);
  await audit(req, "payout.paid", payout, "INFO", {
    gatewayRef: payout.gatewayRef || undefined,
    notes: req.body?.notes || undefined,
  });
  res.json({ success: true, data: payout });
});

module.exports = { list, get, getHistory, create, approve, reject, preview, markPaid };
