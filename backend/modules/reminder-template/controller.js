const { asyncHandler } = require("../../utils/asyncHandler");
const templateService = require("./service");

const listTemplates = asyncHandler(async (req, res) => {
  const result = await templateService.listTemplates(req.user.organizationId, req.user, req.query);
  res.status(200).json({ success: true, data: result });
});

const createTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.createTemplate(req.user.organizationId, req.user, req.body);
  res.status(201).json({ success: true, data: template });
});

const updateTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.updateTemplate(
    req.user.organizationId,
    req.user,
    req.params.id,
    req.body
  );
  res.status(200).json({ success: true, data: template });
});

const deleteTemplate = asyncHandler(async (req, res) => {
  await templateService.deleteTemplate(req.user.organizationId, req.user, req.params.id);
  res.status(200).json({ success: true, message: "Template removed" });
});

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate };
