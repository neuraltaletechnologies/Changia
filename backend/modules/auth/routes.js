const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth");
const { authLimiter } = require("../../middlewares/rateLimiter");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("./validation");

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), controller.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), controller.login);
router.post(
  "/forgot-password",
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  controller.forgotPassword
);
router.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  controller.resetPassword
);

router.get("/me", authenticate, controller.me);
router.post("/logout", authenticate, controller.logout);
router.post(
  "/change-password",
  authenticate,
  validate({ body: changePasswordSchema }),
  controller.changePassword
);

module.exports = router;
