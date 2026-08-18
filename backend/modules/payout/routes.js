const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { listSchema, createSchema, decisionSchema, paidSchema } = require("./validation");

// Org-level payouts (SUPER_ADMIN/ORG_ADMIN, no campaign attached) and
// campaign-scoped manager requests (CAMPAIGN_MANAGER, campaignId + reason
// required) share this module. List/get are scoped per-role in the service
// (a manager only ever sees their own requests). Deciding a request
// (approve/reject) is admin-only, per the user's explicit ask that an
// ORG_ADMIN — not just SUPER_ADMIN — can approve/reject; confirming the
// gateway payment actually happened (markPaid) stays SUPER_ADMIN-only.
const router = Router();
router.use(authenticate);
router.get("/", validate({ query: listSchema }), controller.list);
router.post(
  "/",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: createSchema }),
  controller.create
);
router.get("/:id", controller.get);
router.post(
  "/:id/approve",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: decisionSchema }),
  controller.approve
);
router.post(
  "/:id/reject",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: decisionSchema }),
  controller.reject
);
router.post("/:id/paid", authorize("SUPER_ADMIN"), validate({ body: paidSchema }), controller.markPaid);
module.exports = router;
