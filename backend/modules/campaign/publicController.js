const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const campaignService = require("./service");

const listPublicCampaigns = asyncHandler(async (req, res) => {
  const featured = req.query.featured === "true";
  const campaigns = await campaignService.listPublicCampaigns({
    featured,
    limit: req.query.limit,
    locale: req.query.locale,
  });
  res.status(200).json({ success: true, data: { campaigns } });
});

const getPublicCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.getPublicCampaign(req.params.id, req.query.locale);
  if (!campaign) throw ApiError.notFound("Campaign not found");
  res.status(200).json({ success: true, data: campaign });
});

module.exports = { listPublicCampaigns, getPublicCampaign };
