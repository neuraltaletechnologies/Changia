const { Router } = require("express");
const { validate } = require("../../middlewares/validate");
const controller = require("./publicController");
const { publicContributionSchema } = require("./validation");

// Unauthenticated: lets a visitor on a public campaign page contribute
// directly. No PIN is ever accepted here — only a phone number and amount;
// the donor approves the actual payment at their operator's own prompt.
const router = Router();

router.post(
  "/campaigns/:campaignId/contributions",
  validate({ body: publicContributionSchema }),
  controller.createContribution
);
router.get("/contributions/:attemptId", controller.getContributionStatus);
router.post("/contributions/:attemptId/simulate-confirm", controller.simulateConfirm);

module.exports = router;
