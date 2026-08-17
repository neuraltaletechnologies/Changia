const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { listSchema, createSchema, decisionSchema, paidSchema } = require("./validation");

const router = Router();
router.use(authenticate, authorize("SUPER_ADMIN", "ORG_ADMIN"));
router.get("/", validate({ query: listSchema }), controller.list);
router.post("/", validate({ body: createSchema }), controller.create);
router.get("/:id", controller.get);
router.post("/:id/approve", authorize("SUPER_ADMIN"), validate({ body: decisionSchema }), controller.approve);
router.post("/:id/reject", authorize("SUPER_ADMIN"), validate({ body: decisionSchema }), controller.reject);
router.post("/:id/paid", authorize("SUPER_ADMIN"), validate({ body: paidSchema }), controller.markPaid);
module.exports = router;
