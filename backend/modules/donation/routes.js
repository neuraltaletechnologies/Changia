const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const {
  listDonationsQuerySchema,
  createPaymentAttemptSchema,
  simulateCallbackSchema,
  createManualDonationSchema,
} = require("./validation");

const router = Router();

router.use(authenticate);

router.get("/", validate({ query: listDonationsQuerySchema }), controller.listDonations);
router.get("/campaigns/:campaignId/attempts", controller.listPaymentAttempts);

router.post(
  "/",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: createManualDonationSchema }),
  controller.recordManualDonation
);

// Managers + admins can send push payment requests
router.post(
  "/campaigns/:campaignId/attempts",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: createPaymentAttemptSchema }),
  controller.createPaymentAttempt
);

// ⚠️ Development-only route that simulates the payment gateway callback.
// In production this is replaced by a signature-verified webhook endpoint.
router.post(
  "/simulate-callback",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: simulateCallbackSchema }),
  controller.simulateGatewayCallback
);

module.exports = router;
