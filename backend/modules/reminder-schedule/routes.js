const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const {
  createScheduleSchema,
  updateScheduleSchema,
  listSchedulesQuerySchema,
} = require("./validation");

const router = Router();

router.use(authenticate);

// ─── Pending approval queue (must be registered before /:id routes) ─────────
router.get("/pending", controller.listPending);
router.post(
  "/pending/:id/confirm",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.confirmPending
);
router.post(
  "/pending/:id/skip",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.skipPending
);

// ─── Schedules ────────────────────────────────────────────────────────────────
router.get("/", validate({ query: listSchedulesQuerySchema }), controller.listSchedules);
router.post(
  "/",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: createScheduleSchema }),
  controller.createSchedule
);
router.put(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: updateScheduleSchema }),
  controller.updateSchedule
);
router.delete(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.deleteSchedule
);

module.exports = router;
