const { asyncHandler } = require("../../utils/asyncHandler");
const scheduleService = require("./service");

const listSchedules = asyncHandler(async (req, res) => {
  const result = await scheduleService.listSchedules(req.user.organizationId, req.user, req.query);
  res.status(200).json({ success: true, data: result });
});

const createSchedule = asyncHandler(async (req, res) => {
  const schedule = await scheduleService.createSchedule(req.user.organizationId, req.user, req.body);
  res.status(201).json({ success: true, data: schedule });
});

const updateSchedule = asyncHandler(async (req, res) => {
  const schedule = await scheduleService.updateSchedule(
    req.user.organizationId,
    req.user,
    req.params.id,
    req.body
  );
  res.status(200).json({ success: true, data: schedule });
});

const deleteSchedule = asyncHandler(async (req, res) => {
  await scheduleService.deleteSchedule(req.user.organizationId, req.user, req.params.id);
  res.status(200).json({ success: true, message: "Reminder schedule removed" });
});

const listPending = asyncHandler(async (req, res) => {
  const result = await scheduleService.listPending(req.user.organizationId, req.user);
  res.status(200).json({ success: true, data: result });
});

const confirmPending = asyncHandler(async (req, res) => {
  const result = await scheduleService.confirmPending(req.user.organizationId, req.user, req.params.id);
  res.status(200).json({ success: true, data: result });
});

const skipPending = asyncHandler(async (req, res) => {
  const result = await scheduleService.skipPending(req.user.organizationId, req.user, req.params.id);
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listPending,
  confirmPending,
  skipPending,
};
