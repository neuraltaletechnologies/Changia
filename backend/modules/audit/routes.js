const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { listAuditLogsQuerySchema } = require("./validation");

const router = Router();

router.use(authenticate);

// The audit log is platform-level — SUPER_ADMIN only. An ORG_ADMIN no longer
// has access to the audit log page or its data.
router.get(
  "/export",
  authorize("SUPER_ADMIN"),
  validate({ query: listAuditLogsQuerySchema }),
  controller.exportAuditLogs
);
router.get(
  "/",
  authorize("SUPER_ADMIN"),
  validate({ query: listAuditLogsQuerySchema }),
  controller.listAuditLogs
);
router.get("/recent", authorize("SUPER_ADMIN"), controller.recentActivity);

module.exports = router;
