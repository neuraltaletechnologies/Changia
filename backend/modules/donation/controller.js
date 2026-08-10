const { asyncHandler } = require("../../utils/asyncHandler");
const db = require("../../db");
const donationService = require("./service");

const listDonations = asyncHandler(async (req, res) => {
  const result = await donationService.listDonations(req.user.organizationId, req.query);
  res.status(200).json({ success: true, data: result });
});

/** Manager sends a direct payment request (push donation). */
const createPaymentAttempt = asyncHandler(async (req, res) => {
  const attempt = await donationService.createPaymentAttempt({
    organizationId: req.user.organizationId,
    campaignId: req.params.campaignId,
    initiatedById: req.user.id,
    donorId: req.body.donorId,
    donorPhone: req.body.donorPhone,
    donorName: req.body.donorName,
    amount: req.body.amount,
    method: "PUSH",
  });

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, details, severity)
     VALUES (?, ?, ?, 'payment.requested', 'payment_attempt', ?, ?, 'INFO')`,
    [
      req.user.organizationId,
      req.user.id,
      req.user.email,
      String(attempt.id),
      JSON.stringify({ amount: num(attempt.amount), campaignId: attempt.campaign_id }),
    ]
  );

  res.status(201).json({
    success: true,
    data: {
      ...attempt,
      amount: num(attempt.amount),
      message:
        "Payment request sent. The donor must confirm with their PIN at the operator prompt.",
    },
  });
});

const listPaymentAttempts = asyncHandler(async (req, res) => {
  const attempts = await donationService.listPaymentAttempts(
    req.user.organizationId,
    req.params.campaignId
  );
  res.status(200).json({ success: true, data: attempts });
});

/**
 * Simulated gateway callback for local development — in production this is a
 * signed webhook from the payment provider. The idempotency + confirmed-only
 * rules are identical.
 */
const simulateGatewayCallback = asyncHandler(async (req, res) => {
  const outcome = await donationService.resolvePaymentAttempt(
    req.body.attemptId,
    req.body.result
  );
  res.status(200).json({ success: true, data: outcome });
});

function num(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

module.exports = {
  listDonations,
  createPaymentAttempt,
  listPaymentAttempts,
  simulateGatewayCallback,
};
