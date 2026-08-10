const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const controller = require("./controller");
const { createUserSchema, updateUserSchema, listUsersQuerySchema } = require("./validation");

const router = Router();

router.use(authenticate);

router.get("/", validate({ query: listUsersQuerySchema }), controller.listUsers);
router.post(
  "/",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: createUserSchema }),
  controller.createUser
);
router.put(
  "/:id",
  authorize("SUPER_ADMIN", "ORG_ADMIN"),
  validate({ body: updateUserSchema }),
  controller.updateUser
);
router.delete("/:id", authorize("SUPER_ADMIN", "ORG_ADMIN"), controller.deleteUser);

module.exports = router;
