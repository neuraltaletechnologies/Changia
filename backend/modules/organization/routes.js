const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { updateOrganizationSchema } = require("./validation");

const router = Router();

router.use(authenticate);

router.get("/", controller.getMyOrganization);
router.get("/all", authorize("SUPER_ADMIN"), controller.listOrganizations);
router.get("/stats", controller.getStats);
router.put(
  "/",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: updateOrganizationSchema }),
  controller.updateMyOrganization
);

module.exports = router;
