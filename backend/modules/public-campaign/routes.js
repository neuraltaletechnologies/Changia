const { Router } = require("express");
const campaignService = require("../campaign/service");
const { asyncHandler } = require("../../utils/asyncHandler");

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await campaignService.listPublicCampaigns(req.query);
    res.status(200).json({ success: true, data: result });
  })
);

router.get(
  "/:slugOrId",
  asyncHandler(async (req, res) => {
    const campaign = await campaignService.getPublicCampaign(req.params.slugOrId);
    res.status(200).json({ success: true, data: campaign });
  })
);

module.exports = router;
