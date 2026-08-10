const { z } = require("zod");

const listAuditLogsQuerySchema = z.object({
  action: z.string().max(100).optional(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

module.exports = { listAuditLogsQuerySchema };
