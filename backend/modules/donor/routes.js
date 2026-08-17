const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const {
  createDonorSchema,
  updateDonorSchema,
  listDonorsQuerySchema,
  addPaymentMethodSchema,
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

// Payment methods
router.post(
  "/:id/payment-methods",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: addPaymentMethodSchema }),
  controller.addPaymentMethod
);
router.delete(
  "/:id/payment-methods/:methodId",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.removePaymentMethod
);

module.exports = router;