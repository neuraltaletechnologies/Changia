const { Router } = require("express");
const { asyncHandler } = require("../../utils/asyncHandler");
const service = require("./service");

// Unauthenticated: the "What Campaign Owners Say" cards on the public
// /campaigns and /sw/campaigns pages. `?locale=sw` returns the machine-
// translated quote/role where present (falls back to English otherwise).
const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const locale = req.query.locale === "sw" ? "sw" : "en";
    const testimonials = await service.listPublic(locale);
    res.json({ success: true, data: { testimonials } });
  })
);

module.exports = router;
