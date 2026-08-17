const { asyncHandler } = require("../../utils/asyncHandler");
const donationService = require("./service");

/** A public visitor initiates their own contribution — no PIN collected here. */
const createContribution = asyncHandler(async (req, res) => {
  const result = await donationService.createPublicContribution(req.params.campaignId, req.body);
  res.status(201).json({
    success: true,
    data: {
      ...result,
      message: "Approve the request on your phone to complete the contribution.",
    },
  });
});

const getContributionStatus = asyncHandler(async (req, res) => {
  const status = await donationService.getPublicAttemptStatus(req.params.attemptId);
  res.status(200).json({ success: true, data: status });
});

/** ⚠️ Development-only demo trigger — stands in for the gateway's callback. */
const simulateConfirm = asyncHandler(async (req, res) => {
  const result = await donationService.simulatePublicConfirm(req.params.attemptId);
  res.status(200).json({ success: true, data: result });
});

module.exports = { createContribution, getContributionStatus, simulateConfirm };
