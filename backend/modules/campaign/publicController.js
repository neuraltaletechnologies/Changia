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

/** A public visitor pledges an in-kind gift on the campaign page. */
const createGiftPledge = asyncHandler(async (req, res) => {
  const pledge = await campaignService.createPublicGiftPledge(req.params.id, req.body);
  res.status(201).json({
    success: true,
    data: {
      ...pledge,
      message:
        pledge.deliveryMethod === "PICKUP"
          ? "Thank you! The campaign team will contact you to arrange a pickup."
          : "Thank you! The campaign team will contact you to confirm your drop-off.",
    },
  });
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
  createGiftPledge,
  listCompletedCampaigns,
  getCompletedCampaign,
};
