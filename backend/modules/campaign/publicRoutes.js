const { Router } = require("express");
const { validate } = require("../../middlewares/validate");
const controller = require("./publicController");
const { publicListQuerySchema, publicDetailQuerySchema } = require("./validation");

// Unauthenticated: powers the public marketing site (homepage featured
// picks, the /campaigns listing, and a campaign's public detail page).
const router = Router();

router.get("/", validate({ query: publicListQuerySchema }), controller.listPublicCampaigns);

// Impact stories (completed campaigns with an approved completion report) —
// registered ahead of the generic "/:id" below so "completed" isn't swallowed
// as a campaign id/slug.
router.get("/completed", controller.listCompletedCampaigns);
router.get("/completed/:id", controller.getCompletedCampaign);

router.get("/:id", validate({ query: publicDetailQuerySchema }), controller.getPublicCampaign);

module.exports = router;
