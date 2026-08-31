const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const { uploadPayoutProof } = require("../../middlewares/upload");
const controller = require("./controller");
const { listSchema, createSchema, decisionSchema, confirmSchema } = require("./validation");

// Payouts follow the same two-person chain as campaigns:
//   request (CAMPAIGN_MANAGER — the role placed under an organisation; a
//            campaignId + reason + mobile-money destination are required)
//     -> REVIEWED  (stage 1 — a REVIEWER or SUPER_ADMIN, not the requester)
//     -> APPROVED  (stage 2 — an ORG_ADMIN or SUPER_ADMIN, a different person;
//                   the funds now sit on hold)
//     -> PAID      (the requesting CAMPAIGN_MANAGER confirms the release, which
//                   atomically fires the ClickPesa mobile-money transfer)
// approve/reject accept all three approver roles; the service picks the stage
// from the payout's current status and enforces the "different people" rule.
// Only one payout per campaign may be in flight (not PAID / REJECTED) at a time.
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
// Optional "proof of use" photos on the manager's own request — invoices,
// receipts, site photos — visible to the reviewer + org admin. Only the
// requester, and only while the request is still in review (REQUESTED/REVIEWED).
router.post(
  "/:id/proof",
  authorize("CAMPAIGN_MANAGER"),
  uploadPayoutProof,
  controller.attachProof
);
router.delete("/:id/proof/:imageId", authorize("CAMPAIGN_MANAGER"), controller.removeProof);
// Full chronological trail (audit_logs) for one payout — requested / reviewed /
// approved / rejected (with reason) / released. Visible to anyone who can see
// the payout itself (getPayout enforces it).
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
// Release confirmation — the requesting CAMPAIGN_MANAGER confirms an APPROVED
// payout, which atomically executes the ClickPesa transfer. APPROVED -> PAID.
router.post(
  "/:id/confirm",
  authorize("CAMPAIGN_MANAGER"),
  validate({ body: confirmSchema }),
  controller.confirm
);
module.exports = router;
