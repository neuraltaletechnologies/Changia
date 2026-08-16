const { asyncHandler } = require("../../utils/asyncHandler");
const db = require("../../db");
const userService = require("./service");

const listUsers = asyncHandler(async (req, res) => {
  const result = await userService.listUsers(req.user, req.query);
  res.status(200).json({ success: true, data: result });
});

const createUser = asyncHandler(async (req, res) => {
  const result = await userService.createUser(req.user, req.body);

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'user.invited', 'user', ?, 'INFO')`,
    [result.user.organizationId, req.user.id, req.user.email, String(result.user.id)]
  );

  res.status(201).json({ success: true, data: result });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.user, req.params.id, req.body);

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'user.updated', 'user', ?, 'INFO')`,
    [user.organizationId, req.user.id, req.user.email, String(user.id)]
  );

  res.status(200).json({ success: true, data: user });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await userService.deleteUser(req.user, req.params.id);

  await db.execute(
    `INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, resource, resource_id, severity)
     VALUES (?, ?, ?, 'user.removed', 'user', ?, 'WARNING')`,
    [user.organizationId, req.user.id, req.user.email, req.params.id]
  );

  res.status(200).json({ success: true, message: "User member removed" });
});

module.exports = { listUsers, createUser, updateUser, deleteUser };