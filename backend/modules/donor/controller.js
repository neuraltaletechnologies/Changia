const { asyncHandler } = require("../../utils/asyncHandler");
const db = require("../../db");
const donorService = require("./service");

const listDonors = asyncHandler(async (req, res) => {
  const result = await donorService.listDonors(req.user.organizationId, req.query);
  res.status(200).json({ success: true, data: result });
});

const getDonor = asyncHandler(async (req, res) => {
  const donor = await donorService.getDonor(req.user.organizationId, req.params.id);
  res.status(200).json({ success: true, data: donor });
});

const createDonor = asyncHandler(async (req, res) => {
  const donor = await donorService.createDonor(req.user.organizationId, req.body);

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'donor.created', 'donor', ?, 'INFO')`,
    [req.user.organizationId, req.user.id, req.user.email, String(donor.id)]
  );

  res.status(201).json({ success: true, data: donor });
});

const updateDonor = asyncHandler(async (req, res) => {
  const donor = await donorService.updateDonor(
    req.user.organizationId,
    req.params.id,
    req.body
  );

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'donor.updated', 'donor', ?, 'INFO')`,
    [req.user.organizationId, req.user.id, req.user.email, String(donor.id)]
  );

  res.status(200).json({ success: true, data: donor });
});

const deleteDonor = asyncHandler(async (req, res) => {
  await donorService.deleteDonor(req.user.organizationId, req.params.id);

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'donor.deleted', 'donor', ?, 'WARNING')`,
    [req.user.organizationId, req.user.id, req.user.email, req.params.id]
  );

  res.status(200).json({ success: true, message: "Donor removed" });
});

module.exports = { listDonors, getDonor, createDonor, updateDonor, deleteDonor };
