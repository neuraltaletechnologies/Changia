const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth");
const { authLimiter } = require("../../middlewares/rateLimiter");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { registerSchema, loginSchema, changePasswordSchema } = require("./validation");

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), controller.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), controller.login);

router.get("/me", authenticate, controller.me);
router.post(
  "/change-password",
  authenticate,
  validate({ body: changePasswordSchema }),
  controller.changePassword
);

module.exports = router;
