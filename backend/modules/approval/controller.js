const { asyncHandler } = require("../../utils/asyncHandler");
const service = require("./service");

const history = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.myApprovalHistory(req.user, req.query) });
});

module.exports = { history };
