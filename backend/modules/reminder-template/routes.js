const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
} = require("./validation");

const router = Router();

router.use(authenticate);

router.get("/", validate({ query: listTemplatesQuerySchema }), controller.listTemplates);
router.post(
  "/",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: createTemplateSchema }),
  controller.createTemplate
);
router.put(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: updateTemplateSchema }),
  controller.updateTemplate
);
router.delete(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.deleteTemplate
);

module.exports = router;
