const { asyncHandler } = require("../../utils/asyncHandler");
const { deleteUploadedFiles } = require("../../middlewares/upload");
const service = require("./service");

const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { testimonials: await service.listAll() } });
});

const create = asyncHandler(async (req, res) => {
  const testimonial = await service.create(req.user, req.body);
  res.status(201).json({ success: true, data: testimonial });
});

const update = asyncHandler(async (req, res) => {
  const testimonial = await service.update(req.user, req.params.id, req.body);
  res.json({ success: true, data: testimonial });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user, req.params.id);
  res.json({ success: true, data: { id: Number(req.params.id) } });
});

const reorder = asyncHandler(async (req, res) => {
  const testimonials = await service.reorder(req.user, req.body.ids);
  res.json({ success: true, data: { testimonials } });
});

/** multer (uploadTestimonialPhoto) runs before this — req.file is the portrait. */
const uploadPhoto = asyncHandler(async (req, res) => {
  try {
    const testimonial = await service.setPhoto(req.user, req.params.id, req.file);
    res.json({ success: true, data: testimonial });
  } catch (error) {
    if (req.file) deleteUploadedFiles([req.file]);
    throw error;
  }
});

module.exports = { list, create, update, remove, reorder, uploadPhoto };
