const { asyncHandler } = require("../../utils/asyncHandler");
const db = require("../../db");
const { deleteUploadedFiles } = require("../../middlewares/upload");
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
/** multer (uploadPayoutProof) runs before this — req.files is a flat array.
 *  Any business-rule failure still needs the files cleaned off disk. */
const attachProof = asyncHandler(async (req, res) => {
  try {
    const payout = await service.attachProofImages(
      req.user.organizationId,
      req.user,
      req.params.id,
      req.files
    );
    await audit(req, "payout.proof_added", payout, "INFO", {
      count: (req.files || []).length,
    });
    res.status(200).json({ success: true, data: payout });
  } catch (error) {
    deleteUploadedFiles(req.files);
    throw error;
  }
});

const removeProof = asyncHandler(async (req, res) => {
  const payout = await service.removeProofImage(
    req.user.organizationId,
    req.user,
    req.params.id,
    req.params.imageId
  );
  await audit(req, "payout.proof_removed", payout, "INFO");
  res.json({ success: true, data: payout });
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
 * The requesting CAMPAIGN_MANAGER confirms an APPROVED payout — this atomically
 * fires the ClickPesa transfer and moves APPROVED -> PAID.
 * POST /payouts/:id/confirm
 */
const confirm = asyncHandler(async (req, res) => {
  const payout = await service.confirmPayout(
    req.user.organizationId,
    req.user,
    req.params.id,
    req.body
  );
  await audit(req, "payout.confirmed", payout, "INFO", req.body?.notes ? { notes: req.body.notes } : undefined);
  await audit(req, "payout.paid", payout, "INFO", {
    gatewayRef: payout.gatewayRef || undefined,
  });
  res.json({ success: true, data: payout });
});

module.exports = { list, get, getHistory, create, attachProof, removeProof, approve, reject, confirm };
