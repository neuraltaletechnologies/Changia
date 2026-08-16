const { asyncHandler } = require("../../utils/asyncHandler");
const poolService = require("./service");

const listPools = asyncHandler(async (req, res) => {
  const result = await poolService.listPools(req.user.organizationId, req.user, req.query);
  res.status(200).json({ success: true, data: result });
});

const createPool = asyncHandler(async (req, res) => {
  const pool = await poolService.createPool(req.user.organizationId, req.user, req.body);
  res.status(201).json({ success: true, data: pool });
});

const getPool = asyncHandler(async (req, res) => {
  const pool = await poolService.getPool(
    req.user.organizationId,
    req.user,
    req.params.id,
    req.query.campaignId
  );
  res.status(200).json({ success: true, data: pool });
});

const updatePool = asyncHandler(async (req, res) => {
  const pool = await poolService.updatePool(
    req.user.organizationId,
    req.user,
    req.params.id,
    req.body
  );
  res.status(200).json({ success: true, data: pool });
});

const deletePool = asyncHandler(async (req, res) => {
  await poolService.deletePool(req.user.organizationId, req.user, req.params.id);
  res.status(200).json({ success: true, message: "Donor pool removed" });
});

const addMembers = asyncHandler(async (req, res) => {
  const pool = await poolService.addMembers(req.user.organizationId, req.user, req.params.id, req.body);
  res.status(201).json({ success: true, data: pool });
});

const setMemberExpected = asyncHandler(async (req, res) => {
  const pool = await poolService.setMemberExpected(
    req.user.organizationId,
    req.user,
    req.params.id,
    req.params.donorId,
    req.body.expectedAmount ?? null
  );
  res.status(200).json({ success: true, data: pool });
});

const removeMember = asyncHandler(async (req, res) => {
  const pool = await poolService.removeMember(
    req.user.organizationId,
    req.user,
    req.params.id,
    req.params.donorId
  );
  res.status(200).json({ success: true, data: pool });
});

const getDuplicates = asyncHandler(async (req, res) => {
  const poolIds = req.query.poolIds
    ? String(req.query.poolIds).split(",").map(Number).filter(Boolean)
    : undefined;
  const result = await poolService.listDuplicateGroups(
    req.user.organizationId,
    req.user,
    poolIds
  );
  res.status(200).json({ success: true, data: result });
});

const resolveDuplicates = asyncHandler(async (req, res) => {
  const result = await poolService.resolveDuplicates(
    req.user.organizationId,
    req.user,
    req.body
  );
  res.status(200).json({ success: true, data: result });
});

const getAnomalousPool = asyncHandler(async (req, res) => {
  const pool = await poolService.getAnomalousPool(
    req.user.organizationId,
    req.user,
    req.query.managerId
  );
  res.status(200).json({ success: true, data: pool });
});

const mergeAnomalous = asyncHandler(async (req, res) => {
  const result = await poolService.mergeAnomalous(
    req.user.organizationId,
    req.user,
    req.params.anomalousDonorId,
    req.body
  );
  res.status(200).json({ success: true, data: result });
});

const sendReminder = asyncHandler(async (req, res) => {
  const result = await poolService.sendReminder(req.user.organizationId, req.user, req.body);
  res.status(201).json({ success: true, data: result });
});

module.exports = {
  listPools,
  createPool,
  getPool,
  updatePool,
  deletePool,
  addMembers,
  setMemberExpected,
  removeMember,
  getDuplicates,
  resolveDuplicates,
  getAnomalousPool,
  mergeAnomalous,
  sendReminder,
};