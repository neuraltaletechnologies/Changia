const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const { uploadCompletionImages } = require("../../middlewares/upload");
const controller = require("./controller");
const {
  createCampaignSchema,
  updateCampaignSchema,
  listCampaignsQuerySchema,
  setManagersSchema,
  campaignStatusSchema,
  poolExpectedSchema,
  targetExpectedSchema,
  featuredSchema,
  translationsSchema,
  completionReportReviewSchema,
} = require("./validation");

const router = Router();

router.use(authenticate);

// All authenticated org members can view campaigns
router.get("/", validate({ query: listCampaignsQuerySchema }), controller.listCampaigns);
router.get("/:id", controller.getCampaign);
router.get("/:id/donor-targets", controller.getDonorTargets);

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

// Creation is available to ORG_ADMIN/CAMPAIGN_MANAGER and activates
// immediately — they're trusted org staff, not the public, so there's no
// separate approval gate. submit/approve below remain only for any campaign
// still sitting in a legacy PENDING state. SUPER_ADMIN deliberately can't
// create campaigns (or donor pools) — platform-wide, they only manage/edit
// what orgs already created.
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
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  controller.approveCampaign
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
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: completionReportReviewSchema }),
  controller.reviewCompletionReport
);

router.delete(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  controller.removeCampaign
);

module.exports = router;
