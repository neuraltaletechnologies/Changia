const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const {
  createCampaignSchema,
  updateCampaignSchema,
  listCampaignsQuerySchema,
  setManagersSchema,
  campaignStatusSchema,
  poolExpectedSchema,
  targetExpectedSchema,
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

// Creation is available to everyone in the org; a CM creates the campaign and
// an admin approves it (submit/approve remain administrator-only).
router.post(
  "/",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
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
router.delete(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  controller.removeCampaign
);

module.exports = router;
