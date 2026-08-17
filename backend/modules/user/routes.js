const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { createUserSchema, updateUserSchema, listUsersQuerySchema } = require("./validation");

const router = Router();

router.use(authenticate);

/**
 * Lets a user update their own profile (name/phone) regardless of role —
 * the service layer already blocks a self-update from touching role/status
 * — while still requiring an admin to edit anyone else.
 */
function authorizeSelfOrAdmin(req, res, next) {
  if (String(req.user.id) === String(req.params.id)) return next();
  return authorize("SUPER_ADMIN", "ORG_ADMIN")(req, res, next);
}

router.get("/", validate({ query: listUsersQuerySchema }), controller.listUsers);
router.post(
  "/",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: createUserSchema }),
  controller.createUser
);
router.put(
  "/:id",
  authorizeSelfOrAdmin,
  validate({ body: updateUserSchema }),
  controller.updateUser
);
router.post("/:id/resend-invite", authorize("SUPER_ADMIN", "ORG_ADMIN"), controller.resendInvite);
router.delete("/:id", authorize("SUPER_ADMIN", "ORG_ADMIN"), controller.deleteUser);

module.exports = router;
