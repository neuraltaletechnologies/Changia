const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { deleteUploadedFiles } = require("../../middlewares/upload");
const campaignService = require("./service");
const { completionReportSchema } = require("./validation");

const listCampaigns = asyncHandler(async (req, res) => {
  const result = await campaignService.listCampaigns(req.user.organizationId, req.query, req.user);
  res.status(200).json({ success: true, data: result });
});

const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.getCampaign(
    req.user.organizationId,
    req.params.id,
    req.user
  );
  res.status(200).json({ success: true, data: campaign });
});

const createCampaign = asyncHandler(async (req, res) => {
  const campaign = await campaignService.createCampaign(req.user.organizationId, req.body, {
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
  });
  res.status(201).json({ success: true, data: campaign });
});

const updateCampaign = asyncHandler(async (req, res) => {
  await campaignService.assertCampaignAccess(req.user.organizationId, req.user, req.params.id);
  const campaign = await campaignService.updateCampaign(
    req.user.organizationId,
    req.params.id,
    req.body,
    { id: req.user.id, email: req.user.email }
  );
  res.status(200).json({ success: true, data: campaign });
});

const submitCampaign = asyncHandler(async (req, res) => {
  await campaignService.assertCampaignAccess(req.user.organizationId, req.user, req.params.id);
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

const previewPools = asyncHandler(async (req, res) => {
  await campaignService.assertCampaignAccess(req.user.organizationId, req.user, req.params.id);
  const result = await campaignService.previewPoolImport(
    req.user.organizationId,
    req.user,
    req.params.id,
    req.body.poolIds
  );
  res.status(200).json({ success: true, data: result });
});

const importPools = asyncHandler(async (req, res) => {
  await campaignService.assertCampaignAccess(req.user.organizationId, req.user, req.params.id);
  const result = await campaignService.importPools(
    req.user.organizationId,
    req.user,
    req.params.id,
    req.body
  );
  res.status(200).json({ success: true, data: result });
});

const getDonorTargets = asyncHandler(async (req, res) => {
  await campaignService.assertCampaignAccess(req.user.organizationId, req.user, req.params.id);
  const result = await campaignService.getCampaignDonorTargets(
    req.user.organizationId,
    req.params.id
  );
  res.status(200).json({ success: true, data: result });
});

const setDonorTarget = asyncHandler(async (req, res) => {
  await campaignService.assertCampaignAccess(req.user.organizationId, req.user, req.params.id);
  const result = await campaignService.setDonorTargetExpected(
    req.user.organizationId,
    req.params.id,
    req.params.donorId,
    req.body.expectedAmount ?? null
  );
  res.status(200).json({ success: true, data: result });
});

const removeDonorTarget = asyncHandler(async (req, res) => {
  await campaignService.assertCampaignAccess(req.user.organizationId, req.user, req.params.id);
  const result = await campaignService.removeDonorTarget(
    req.user.organizationId,
    req.params.id,
    req.params.donorId
  );
  res.status(200).json({ success: true, data: result });
});

const setTranslations = asyncHandler(async (req, res) => {
  await campaignService.assertCampaignAccess(req.user.organizationId, req.user, req.params.id);
  const campaign = await campaignService.setTranslations(
    req.user.organizationId,
    req.params.id,
    req.body,
    { id: req.user.id, email: req.user.email }
  );
  res.status(200).json({ success: true, data: campaign });
});

const setFeatured = asyncHandler(async (req, res) => {
  const campaign = await campaignService.setFeatured(
    req.user.organizationId,
    req.params.id,
    req.body.featured,
    { id: req.user.id, email: req.user.email }
  );
  res.status(200).json({ success: true, data: campaign });
});

const getCompletionReport = asyncHandler(async (req, res) => {
  const report = await campaignService.getCompletionReport(
    req.user.organizationId,
    req.params.id,
    req.user
  );
  res.status(200).json({ success: true, data: report });
});

/** multer (uploadCompletionImages) runs before this in the route chain, so
 *  req.body carries the multipart text fields and req.files the photos —
 *  parsed by hand here (rather than the generic `validate` middleware) so a
 *  validation failure can still clean up the files multer already wrote. */
const submitCompletionReport = asyncHandler(async (req, res) => {
  let data;
  try {
    data = completionReportSchema.parse(req.body);
  } catch (error) {
    deleteUploadedFiles(req.files);
    const issues = (error && error.issues) || [];
    throw ApiError.badRequest("Validation failed — please check the submitted data", "VALIDATION_ERROR", issues);
  }

  try {
    const report = await campaignService.submitCompletionReport(
      req.user.organizationId,
      req.params.id,
      { id: req.user.id, email: req.user.email, role: req.user.role },
      data,
      req.files
    );
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    deleteUploadedFiles(req.files);
    throw error;
  }
});

const reviewCompletionReport = asyncHandler(async (req, res) => {
  const report = await campaignService.reviewCompletionReport(
    req.user.organizationId,
    req.params.id,
    { id: req.user.id, email: req.user.email, role: req.user.role },
    req.body
  );
  res.status(200).json({ success: true, data: report });
});

const removeCampaign = asyncHandler(async (req, res) => {
  const result = await campaignService.removeCampaign(
    req.user.organizationId,
    req.params.id,
    { id: req.user.id, email: req.user.email }
  );
  res.status(200).json({ success: true, data: result });
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
  previewPools,
  importPools,
  getDonorTargets,
  setDonorTarget,
  removeDonorTarget,
  setFeatured,
  setTranslations,
  getCompletionReport,
  submitCompletionReport,
  reviewCompletionReport,
  removeCampaign,
};
