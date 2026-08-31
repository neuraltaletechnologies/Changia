const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const { uploadCompletionImages, uploadCampaignImages } = require("../../middlewares/upload");
const controller = require("./controller");
const {
  createCampaignSchema,
  updateCampaignSchema,
  listCampaignsQuerySchema,
  setManagersSchema,
  campaignStatusSchema,
  statusChangeRequestSchema,
  poolExpectedSchema,
  targetExpectedSchema,
  featuredSchema,
  translationsSchema,
  completionReportReviewSchema,
  closureRequestSchema,
  closureDecisionSchema,
  feeReviewSchema,
  rejectCampaignSchema,
  requestChangesSchema,
  changeRequestDecisionSchema,
  createGiftSchema,
} = require("./validation");

const router = Router();

router.use(authenticate);

// All authenticated org members can view campaigns
router.get("/", validate({ query: listCampaignsQuerySchema }), controller.listCampaigns);
// Per-campaign payment breakdown (paid / unpaid / promised / gifts) for the
// caller's campaigns — a distinct 2-segment path, registered before "/:id".
router.get("/payments/breakdown", controller.getPaymentsBreakdown);
router.get("/:id", controller.getCampaign);
// Full chronological trail (audit_logs) for a campaign — who submitted /
// reviewed / approved / sent it back and why. Viewable by anyone with campaign
// access (assertCampaignAccess in the service): its manager, a reviewer, the
// org admin, a super admin.
router.get("/:id/history", controller.getCampaignHistory);
router.get("/:id/donor-targets", controller.getDonorTargets);

// In-kind gifts recorded against a campaign (non-monetary contributions with an
// estimated TZS value). Viewable by anyone with campaign access; recorded /
// removed by the assigned manager or an admin.
router.get("/:id/gifts", controller.listGifts);
router.post(
  "/:id/gifts",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: createGiftSchema }),
  controller.addGift
);
router.delete(
  "/:id/gifts/:giftId",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.removeGift
);

// Donor pool import into a campaign (start of campaign or mid-campaign)
router.post(
  "/:id/pools/preview",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: poolExpectedSchema }),
  controller.previewPools
);
router.post(
  "/:id/pools/import",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: poolExpectedSchema }),
  controller.importPools
);

// Manage tracked donors (expected pledge / removal) on a campaign
router.put(
  "/:id/donor-targets/:donorId",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: targetExpectedSchema }),
  controller.setDonorTarget
);
router.delete(
  "/:id/donor-targets/:donorId",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.removeDonorTarget
);

// Creation is available to ORG_ADMIN/CAMPAIGN_MANAGER. Every campaign — no
// matter who creates it — clears the same strict two-stage chain via
// POST /:id/approve (PENDING -> REVIEWED -> ACTIVE, see
// campaignService.approveCampaign): stage 1 a REVIEWER, stage 2 an ORG_ADMIN,
// two different people, neither the creator. An ORG_ADMIN who creates a
// campaign therefore still needs a reviewer and a *different* admin to approve
// it. SUPER_ADMIN deliberately can't create campaigns (or donor pools) —
// platform-wide, they only manage/edit/approve what orgs already created.
router.post(
  "/",
  authorize("ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: createCampaignSchema }),
  controller.createCampaign
);
router.put(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: updateCampaignSchema }),
  controller.updateCampaign
);
router.post(
  "/:id/submit",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.submitCampaign
);
router.post(
  "/:id/approve",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"),
  controller.approveCampaign
);
// Scoped narrower than POST /:id/status below (which is admin-only and works
// on any status) — this only rejects a campaign still in the approval chain
// (PENDING/REVIEWED), which is what a REVIEWER is actually meant to gatekeep.
router.post(
  "/:id/reject",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"),
  validate({ body: rejectCampaignSchema }),
  controller.rejectCampaign
);
// Send a campaign in the approval chain back to the manager to fix — a
// non-terminal alternative to reject. Mandatory note.
router.post(
  "/:id/request-changes",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"),
  validate({ body: requestChangesSchema }),
  controller.requestCampaignChanges
);

// Material edits to a live campaign are parked as change requests that clear
// the same two-stage chain. Anyone who can view the campaign can list them;
// only reviewers/admins decide them.
router.get("/:id/change-requests", controller.listChangeRequests);
// A CAMPAIGN_MANAGER asks to suspend (PAUSE) or resume a campaign — parked as a
// STATUS change request that clears the same two-stage chain. Decided via the
// same POST /:id/change-requests/:requestId/decide below.
router.post(
  "/:id/status-requests",
  authorize("CAMPAIGN_MANAGER"),
  validate({ body: statusChangeRequestSchema }),
  controller.requestStatusChange
);
router.post(
  "/:id/change-requests/:requestId/decide",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"),
  validate({ body: changeRequestDecisionSchema }),
  controller.decideChangeRequest
);

// Custom service-fee proposals: a CAMPAIGN_MANAGER can propose a fee % that
// differs from the org default (via POST / or PUT /:id with serviceFeePercent);
// it stays PENDING until a REVIEWER/ORG_ADMIN/SUPER_ADMIN approves or rejects
// it here. On approval the proposed rate becomes the campaign's active fee.
router.post(
  "/:id/fee/review",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"),
  validate({ body: feeReviewSchema }),
  controller.reviewFeeProposal
);
router.post(
  "/:id/status",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: campaignStatusSchema }),
  controller.changeStatus
);
router.put(
  "/:id/managers",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: setManagersSchema }),
  controller.setManagers
);
router.post(
  "/:id/featured",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: featuredSchema }),
  controller.setFeatured
);
router.put(
  "/:id/translations",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: translationsSchema }),
  controller.setTranslations
);

// Completion proof: the assigned CAMPAIGN_MANAGER (and only them — this is
// their mandatory accountability step, not an admin's) submits a narrative +
// at least one photo for a COMPLETED campaign; an admin reviews it. Multer
// parses the multipart form (populating req.body and req.files) before the
// schema is checked by hand in the controller, so a validation failure can
// still clean up the files.
router.get("/:id/completion-report", controller.getCompletionReport);
router.post(
  "/:id/completion-report",
  authorize("CAMPAIGN_MANAGER"),
  uploadCompletionImages,
  controller.submitCompletionReport
);
router.post(
  "/:id/completion-report/review",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"),
  validate({ body: completionReportReviewSchema }),
  controller.reviewCompletionReport
);

// Cover + gallery images — settable at creation time (a second call right
// after POST /) or any time after. SUPER_ADMIN excluded, same as creation.
router.post(
  "/:id/images",
  authorize("ORG_ADMIN", "CAMPAIGN_MANAGER"),
  uploadCampaignImages,
  controller.uploadCampaignImages
);
router.delete(
  "/:id/images/:imageId",
  authorize("ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.removeCampaignImage
);

// Closure requests: the assigned CAMPAIGN_MANAGER asks permission to
// complete the campaign; an admin approves (→ COMPLETED) or rejects (with a
// reason shown back to the manager, who may request again).
router.get("/:id/closure-requests", controller.listClosureRequests);
router.post(
  "/:id/closure-requests",
  authorize("CAMPAIGN_MANAGER"),
  validate({ body: closureRequestSchema }),
  controller.requestClosure
);
router.post(
  "/:id/closure-requests/:requestId/decide",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "REVIEWER"),
  validate({ body: closureDecisionSchema }),
  controller.decideClosureRequest
);

router.delete(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  controller.removeCampaign
);

module.exports = router;
