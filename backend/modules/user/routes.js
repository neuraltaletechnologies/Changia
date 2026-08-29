const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { createUserSchema, updateUserSchema, listUsersQuerySchema } = require("./validation");

const router = Router();

router.use(authenticate);

/**
 * All user & role MANAGEMENT (create / edit role or status / deactivate /
 * remove / re-invite) is SUPER_ADMIN-only. A user may still update their OWN
 * profile (name/phone) — the service layer blocks a self-update from touching
 * role/status. `GET /` stays available to any authenticated org member so the
 * campaign "assign managers" picker can list teammates by name.
 */
function authorizeSelfOrSuperAdmin(req, res, next) {
  if (String(req.user.id) === String(req.params.id)) return next();
  return authorize("SUPER_ADMIN")(req, res, next);
}

router.get("/", validate({ query: listUsersQuerySchema }), controller.listUsers);
router.post(
  "/",
  authorize("SUPER_ADMIN"),
  validate({ body: createUserSchema }),
  controller.createUser
);
router.put(
  "/:id",
  authorizeSelfOrSuperAdmin,
  validate({ body: updateUserSchema }),
  controller.updateUser
);
router.post("/:id/resend-invite", authorize("SUPER_ADMIN"), controller.resendInvite);
router.delete("/:id", authorize("SUPER_ADMIN"), controller.deleteUser);

module.exports = router;
