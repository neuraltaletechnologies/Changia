const { asyncHandler } = require("../../utils/asyncHandler");
const authService = require("./service");

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerOrganization(req.body);
  res.status(201).json({ success: true, data: result });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
});

const me = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentUser(req.user.id);
  res.status(200).json({ success: true, data: result });
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  res.status(200).json({ success: true, message: "Password updated successfully" });
});

module.exports = { register, login, me, changePassword };
