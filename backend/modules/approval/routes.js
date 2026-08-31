const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { historyQuerySchema } = require("./validation");

// The Approvals workspace is platform-level review work — the same three roles
// that can act on the two-stage campaign / payout chain. A CAMPAIGN_MANAGER
// requests things but never approves, so has no approval history here.
const router = Router();
router.use(authenticate);

router.get(
  "/history",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"),
  validate({ query: historyQuerySchema }),
  controller.history
);

module.exports = router;
