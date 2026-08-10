const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const {
  createDonorSchema,
  updateDonorSchema,
  listDonorsQuerySchema,
} = require("./validation");

const router = Router();

router.use(authenticate);

router.get("/", validate({ query: listDonorsQuerySchema }), controller.listDonors);
router.get("/:id", controller.getDonor);
router.post(
  "/",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: createDonorSchema }),
  controller.createDonor
);
router.put(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: updateDonorSchema }),
  controller.updateDonor
);
router.delete("/:id", authorize("SUPER_ADMIN", "ORG_ADMIN"), controller.deleteDonor);

module.exports = router;
