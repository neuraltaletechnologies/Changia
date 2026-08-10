const { asyncHandler } = require("../../utils/asyncHandler");
const organizationService = require("./service");

const getMyOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.getOrganization(req.user.organizationId);
  res.status(200).json({ success: true, data: organization });
});

const updateMyOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.updateOrganization(
    req.user.organizationId,
    req.body
  );
  res.status(200).json({ success: true, data: organization });
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await organizationService.getOrganizationStats(req.user.organizationId);
  res.status(200).json({ success: true, data: stats });
});

module.exports = { getMyOrganization, updateMyOrganization, getStats };
