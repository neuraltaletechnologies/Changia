const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { listAuditLogsQuerySchema } = require("./validation");

const router = Router();

router.use(authenticate);

router.get("/", validate({ query: listAuditLogsQuerySchema }), controller.listAuditLogs);
router.get("/recent", controller.recentActivity);

module.exports = router;
