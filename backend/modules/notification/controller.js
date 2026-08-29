const { asyncHandler } = require("../../utils/asyncHandler");
const notificationService = require("./service");

const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listNotifications(req.user.id, req.query);
  res.status(200).json({ success: true, data: result });
});

const unreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.unreadCount(req.user.id);
  res.status(200).json({ success: true, data: result });
});

const markRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markRead(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user.id);
  res.status(200).json({ success: true, data: result });
});

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
