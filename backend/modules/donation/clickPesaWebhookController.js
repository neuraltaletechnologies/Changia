const db = require("../../db");
const { asyncHandler } = require("../../utils/asyncHandler");
const { validateChecksum, CLICKPESA } = require("../../utils/clickPesa");
const donationService = require("./service");

function num(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

/**
 * Handles ClickPesa webhook callbacks for both COLLECTION (payments/donations)
 * and DISBURSEMENT (payouts) events.
 *
 * Events handled:
 *   PAYMENT RECEIVED  → confirm donation
 *   PAYMENT FAILED    → mark attempt failed
 *   PAYOUT INITIATED  → no-op (already processing)
 *   PAYOUT REFUNDED   → restore reserved payout funds
 *   PAYOUT REVERSED   → restore reserved payout funds
 */
const handleWebhook = asyncHandler(async (req, res) => {
  const payload = req.body;

  // 1. Verify checksum if enabled
  if (CLICKPESA.useChecksum && payload.checksum) {
    try {
      const valid = validateChecksum(payload, payload.checksum);
      if (!valid) {
        console.error("ClickPesa webhook checksum validation failed");
        return res.status(400).json({ success: false, message: "Invalid checksum" });
      }
    } catch (err) {
      console.error("ClickPesa webhook checksum error:", err.message);
      return res.status(400).json({ success: false, message: "Checksum verification failed" });
    }
  }

  const event = payload.event;
  const data = payload.data;

  if (!event || !data) {
    return res.status(400).json({ success: false, message: "Missing event or data" });
  }

  const orderReference = data.orderReference;
  if (!orderReference) {
    return res.status(400).json({ success: false, message: "Missing orderReference" });
  }

  console.log(`ClickPesa webhook: ${event} | ref: ${orderReference}`);

  // 2. Record the gateway event for audit/reconciliation
  const idempotencyKey = `cp_${event}_${orderReference}_${data.id || ""}`;
  try {
    await db.execute(
      `INSERT INTO gateway_events (provider, event_type, reference, idempotency_key, raw_payload, verified, processed_at)
       VALUES ('clickpesa', ?, ?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE processed_at = NOW()`,
      [event, orderReference, idempotencyKey, JSON.stringify(payload)]
    );
  } catch (err) {
    // Duplicate event — already processed
    if (err.code === "ER_DUP_ENTRY") {
      console.log(`ClickPesa webhook duplicate: ${idempotencyKey}`);
      return res.status(200).json({ success: true, message: "Already processed" });
    }
    throw err;
  }

  // 3. Process the event
  try {
    switch (event) {
      case "PAYMENT RECEIVED":
        await handlePaymentReceived(data, orderReference);
        break;
      case "PAYMENT FAILED":
        await handlePaymentFailed(data, orderReference);
        break;
      case "PAYOUT INITIATED":
        // No-op — payout is already in PROCESSING state locally
        console.log(`ClickPesa payout initiated: ${orderReference}`);
        break;
      case "PAYOUT REFUNDED":
        await handlePayoutRefunded(data, orderReference);
        break;
      case "PAYOUT REVERSED":
        await handlePayoutRefunded(data, orderReference);
        break;
      default:
        console.log(`ClickPesa unhandled event: ${event}`);
    }
  } catch (err) {
    console.error(`ClickPesa webhook processing error for ${event}:`, err.message);
    // Still return 200 so ClickPesa doesn't retry — we've logged the event
  }

  res.status(200).json({ success: true, message: "Webhook received" });
});

// ─── Payment (Collection) Handlers ──────────────────────────────────────────

/**
 * A USSD push collection succeeded. Find the matching payment_attempts row
 * and resolve it (which triggers donation recording).
 */
async function handlePaymentReceived(data, orderReference) {
  const rows = await db.query(
    "SELECT * FROM payment_attempts WHERE idempotency_key = ? OR gateway_ref = ?",
    [orderReference, data.id]
  );
  const attempt = rows[0];
  if (!attempt) {
    console.error(`ClickPesa PAYMENT RECEIVED: no matching attempt for ref ${orderReference}`);
    return;
  }
  if (attempt.status !== "PENDING") {
    console.log(`ClickPesa PAYMENT RECEIVED: attempt ${attempt.id} already ${attempt.status}`);
    return;
  }

  await donationService.resolvePaymentAttempt(attempt.id, {
    status: "SUCCESS",
    gatewayRef: data.id || orderReference,
  });
  console.log(`ClickPesa donation confirmed: attempt ${attempt.id}, amount ${attempt.amount}`);
}

/**
 * A USSD push collection failed. Mark the attempt as failed.
 */
async function handlePaymentFailed(data, orderReference) {
  const rows = await db.query(
    "SELECT * FROM payment_attempts WHERE idempotency_key = ? OR gateway_ref = ?",
    [orderReference, data.id]
  );
  const attempt = rows[0];
  if (!attempt) {
    console.error(`ClickPesa PAYMENT FAILED: no matching attempt for ref ${orderReference}`);
    return;
  }
  if (attempt.status !== "PENDING") {
    console.log(`ClickPesa PAYMENT FAILED: attempt ${attempt.id} already ${attempt.status}`);
    return;
  }

  await donationService.resolvePaymentAttempt(attempt.id, {
    status: "FAILED",
    gatewayRef: data.id || orderReference,
  });
  console.log(`ClickPesa payment failed: attempt ${attempt.id}`);
}

// ─── Payout (Disbursement) Handlers ─────────────────────────────────────────

/**
 * A payout was refunded or reversed. Restore the reserved funds.
 */
async function handlePayoutRefunded(data, orderReference) {
  const rows = await db.query(
    "SELECT * FROM payouts WHERE gateway_ref = ? OR id = (SELECT CAST(SUBSTRING_INDEX(?, '-', -1) AS UNSIGNED))",
    [data.id, orderReference]
  );
  const payout = rows[0];
  if (!payout) {
    console.error(`ClickPesa PAYOUT REFUNDED/REVERSED: no matching payout for ref ${orderReference}`);
    return;
  }
  if (payout.status === "REJECTED" || payout.status === "REQUESTED") {
    console.log(`ClickPesa PAYOUT REFUNDED: payout ${payout.id} already ${payout.status}`);
    return;
  }

  // Mark as rejected/refunded — funds are restored to the organization
  await db.execute(
    `UPDATE payouts SET status = 'REJECTED', notes = CONCAT(COALESCE(notes, ''), '\n[ClickPesa] Payout refunded/reversed: ', ?)
     WHERE id = ? AND status NOT IN ('REJECTED', 'REQUESTED')`,
    [data.refund?.message || "Refunded by provider", payout.id]
  );
  console.log(`ClickPesa payout refunded: payout ${payout.id}`);
}

module.exports = { handleWebhook };
