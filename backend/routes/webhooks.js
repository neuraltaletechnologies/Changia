const { Router } = require("express");
const { handleWebhook } = require("../modules/donation/clickPesaWebhookController");

const router = Router();

// ClickPesa webhook endpoint(s). These must NOT be behind authenticate
// middleware — ClickPesa calls them directly. Security is via checksum
// validation inside the controller.

// Primary endpoint
router.post("/clickpesa", handleWebhook);

// Alias endpoint (some ClickPesa setups use event-specific URLs)
router.post("/clickpesa/payment-received", handleWebhook);
router.post("/clickpesa/payout-refunded", handleWebhook);

module.exports = router;
