const { z } = require("zod");

// Query for GET /approvals/history — the signed-in approver's own past
// decisions, newest first, optionally narrowed to one request type.
const historyQuerySchema = z.object({
  type: z
    .enum(["campaign", "edit", "fee", "closure", "report", "payout"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

module.exports = { historyQuerySchema };
