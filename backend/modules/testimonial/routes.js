const { Router } = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { validate } = require("../../middlewares/validate");
const { uploadTestimonialPhoto } = require("../../middlewares/upload");
const controller = require("./controller");
const {
  createSchema,
  updateSchema,
  reorderSchema,
  idParamSchema,
} = require("./validation");

// Platform-managed marketing content — SUPER_ADMIN only. Edited from the
// dashboard Settings › Testimonials tab; surfaced publicly by
// /api/v1/public/testimonials (see publicRoutes.js).
const router = Router();
router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/", controller.list);
router.post("/", validate({ body: createSchema }), controller.create);
router.put("/reorder", validate({ body: reorderSchema }), controller.reorder);
router.put(
  "/:id",
  validate({ params: idParamSchema, body: updateSchema }),
  controller.update
);
router.delete("/:id", validate({ params: idParamSchema }), controller.remove);
router.post(
  "/:id/photo",
  validate({ params: idParamSchema }),
  uploadTestimonialPhoto,
  controller.uploadPhoto
);

module.exports = router;
