const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { listNotificationsQuerySchema } = require("./validation");

const router = Router();

router.use(authenticate);

router.get("/", validate({ query: listNotificationsQuerySchema }), controller.listNotifications);
router.get("/unread-count", controller.unreadCount);
router.post("/read-all", controller.markAllRead);
router.post("/:id/read", controller.markRead);

module.exports = router;
