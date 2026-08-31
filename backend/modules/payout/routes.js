const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { listSchema, createSchema, decisionSchema, paidSchema, previewSchema } = require("./validation");

// Payouts follow the same two-person chain as campaigns:
//   request (CAMPAIGN_MANAGER — the role placed under an organisation; a
//            campaignId + reason are required)
//     -> REVIEWED  (stage 1 — a REVIEWER or SUPER_ADMIN, not the requester)
//     -> APPROVED  (stage 2 — an ORG_ADMIN or SUPER_ADMIN, a different person)
//     -> PAID      (SUPER_ADMIN confirms the gateway transfer)
// approve/reject accept all three approver roles; the service picks the stage
// from the payout's current status and enforces the "different people" rule.
// List/get are scoped per-role in the service (a manager sees only their own
// requests; platform roles — reviewer / org admin / super admin — see every
// org's in-chain requests).
const router = Router();
router.use(authenticate);
router.get("/", validate({ query: listSchema }), controller.list);
router.post(
  "/",
  authorize("CAMPAIGN_MANAGER"),
  validate({ body: createSchema }),
  controller.create
);
router.get("/:id", controller.get);
// Full chronological trail (audit_logs) for one payout — requested / reviewed /
// approved / rejected (with reason) / paid. Visible to anyone who can see the
// payout itself (getPayout enforces it).
router.get("/:id/history", controller.getHistory);
router.post(
  "/:id/approve",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"),
  validate({ body: decisionSchema }),
  controller.approve
);
router.post(
  "/:id/reject",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"),
  validate({ body: decisionSchema }),
  controller.reject
);
// Preview ClickPesa payout — shows fee breakdown before confirmation
router.post(
  "/:id/preview",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: previewSchema }),
  controller.preview
);
router.post("/:id/paid", authorize("SUPER_ADMIN"), validate({ body: paidSchema }), controller.markPaid);
module.exports = router;
