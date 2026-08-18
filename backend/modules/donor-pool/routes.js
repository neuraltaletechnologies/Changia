const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const {
  createPoolSchema,
  updatePoolSchema,
  listPoolsQuerySchema,
  addMembersSchema,
  setExpectedSchema,
  resolveDuplicatesSchema,
  mergeAnomalousSchema,
  reminderSchema,
} = require("./validation");

const router = Router();

router.use(authenticate);

// ─── Reminders (must be registered before /:id routes) ──────────────────────
router.post(
  "/reminders/send",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: reminderSchema }),
  controller.sendReminder
);

// ─── Duplicate resolution across pools ──────────────────────────────────────
router.get("/duplicates", controller.getDuplicates);
router.post(
  "/duplicates/resolve",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: resolveDuplicatesSchema }),
  controller.resolveDuplicates
);

// ─── Anomalous pool (system) ────────────────────────────────────────────────
router.get("/anomalous", controller.getAnomalousPool);
router.post(
  "/anomalous/:anomalousDonorId/merge",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: mergeAnomalousSchema }),
  controller.mergeAnomalous
);

// ─── Pools ──────────────────────────────────────────────────────────────────
// SUPER_ADMIN can't create a donor pool (platform-wide, they only manage/edit
// pools orgs already created) — same rule as campaign creation.
router.get("/", validate({ query: listPoolsQuerySchema }), controller.listPools);
router.post(
  "/",
  authorize("ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: createPoolSchema }),
  controller.createPool
);
router.get("/:id", controller.getPool);
router.put(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: updatePoolSchema }),
  controller.updatePool
);
router.delete(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.deletePool
);

// ─── Members ────────────────────────────────────────────────────────────────
router.post(
  "/:id/members",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: addMembersSchema }),
  controller.addMembers
);
router.put(
  "/:id/members/:donorId",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  validate({ body: setExpectedSchema }),
  controller.setMemberExpected
);
router.delete(
  "/:id/members/:donorId",
  authorize("SUPER_ADMIN", "ORG_ADMIN", "CAMPAIGN_MANAGER"),
  controller.removeMember
);

module.exports = router;