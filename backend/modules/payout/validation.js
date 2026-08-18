const { z } = require("zod");

const amount = z.number().int().positive().max(1_000_000_000_000);
const listSchema = z.object({
  status: z.enum(["REQUESTED", "APPROVED", "PAID", "REJECTED"]).optional(),
  campaignId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
const createSchema = z.object({
  amount,
  campaignId: z.union([z.string(), z.number()]).optional(),
  // Required for a CAMPAIGN_MANAGER request — enforced in the service since
  // it depends on the caller's role, not on the shape of the body alone.
  reason: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});
const decisionSchema = z.object({ notes: z.string().max(2000).optional() });
const paidSchema = z.object({ gatewayRef: z.string().max(255).optional(), notes: z.string().max(2000).optional() });

module.exports = { listSchema, createSchema, decisionSchema, paidSchema };
