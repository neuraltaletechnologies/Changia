const { asyncHandler } = require("../../utils/asyncHandler");
const campaignService = require("./service");

const listCampaigns = asyncHandler(async (req, res) => {
  const result = await campaignService.listCampaigns(req.user.organizationId, req.query);
  res.status(200).json({ success: true, data: result });
});

const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.getCampaign(
    req.user.organizationId,
    req.params.id
  );
  res.status(200).json({ success: true, data: campaign });
});

const createCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.createCampaign(req.user.organizationId, req.body, {
    id: req.user.id,
    email: req.user.email,
  });
  res.status(201).json({ success: true, data: campaign });
});

const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.updateCampaign(
    req.user.organizationId,
    req.params.id,
    req.body,
    { id: req.user.id, email: req.user.email }
  );
  res.status(200).json({ success: true, data: campaign });
});

const submitCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.submitCampaign(
    req.user.organizationId,
    req.params.id,
    { id: req.user.id, email: req.user.email }
  );
  res.status(200).json({ success: true, data: campaign });
});

const approveCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.approveCampaign(
    req.user.organizationId,
    req.params.id,
    { id: req.user.id, email: req.user.email }
  );
  res.status(200).json({ success: true, data: campaign });
});

const changeStatus = asyncHandler(async (req, res) => {
  const campaign = await campaignService.changeCampaignStatus(
    req.user.organizationId,
    req.params.id,
    req.body.status,
    { id: req.user.id, email: req.user.email }
  );
  res.status(200).json({ success: true, data: campaign });
});

const setManagers = asyncHandler(async (req, res) => {
  const campaign = await campaignService.setCampaignManagers(
    req.user.organizationId,
    req.params.id,
    req.body.userIds
  );
  res.status(200).json({ success: true, data: campaign });
});

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  submitCampaign,
  approveCampaign,
  changeStatus,
  setManagers,
};
