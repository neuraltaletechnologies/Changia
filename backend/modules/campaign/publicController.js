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

/** Completed campaigns with an APPROVED completion report — the public
 *  "impact stories" blog listing. */
const listCompletedCampaigns = asyncHandler(async (req, res) => {
  const result = await campaignService.listPublicCompletedCampaigns({
    locale: req.query.locale,
    page: req.query.page,
    limit: req.query.limit,
  });
  res.status(200).json({ success: true, data: result });
});

const getCompletedCampaign = asyncHandler(async (req, res) => {
  const post = await campaignService.getPublicCompletedCampaign(req.params.id, req.query.locale);
  if (!post) throw ApiError.notFound("Story not found");
  res.status(200).json({ success: true, data: post });
});

module.exports = {
  listPublicCampaigns,
  getPublicCampaign,
  listCompletedCampaigns,
  getCompletedCampaign,
};
