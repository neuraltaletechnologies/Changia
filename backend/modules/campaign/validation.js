const { z } = require("zod");

const poolIdSchema = z.union([z.string(), z.number()]);
const amountSchema = z
  .number({ message: "Amount must be a number" })
  .int("Amount must be a whole TZS number")
  .min(0, "Amount cannot be negative");

const poolExpectedSchema = z.object({
  poolIds: z.array(poolIdSchema).min(1).max(50),
  duplicateChoices: z
    .array(z.object({ donorId: poolIdSchema, poolId: poolIdSchema }))
    .optional(),
  expectedAmounts: z
    .record(z.string(), z.record(z.string(), amountSchema))
    .optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name is required").max(150),
  story: z.string().max(20000).optional(),
  nameSw: z.string().min(3).max(150).optional().or(z.literal("")),
  storySw: z.string().max(20000).optional().or(z.literal("")),
  categorySw: z.string().max(100).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  category: z.string().max(100).optional(),
  goalAmount: z
    .number({ message: "Goal amount must be a number" })
    .positive("Goal amount must be greater than zero")
    .max(1_000_000_000_000),
  serviceFeePercent: z.number().min(0).max(100).optional(),
  minimumAmount: z.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  contactPhone: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number")
    .optional(),
  managerIds: z.array(z.union([z.string(), z.number()])).max(50).optional(),
  // When true the campaign is stored as a DRAFT the creator keeps working on
  // (edit details/photos, import pools) and later submits via POST /:id/submit.
  // Omitted / false keeps the old behaviour: created straight as PENDING.
  asDraft: z.boolean().optional(),
  poolIds: z.array(poolIdSchema).max(50).optional(),
  expectedAmounts: z
    .record(z.string(), z.record(z.string(), amountSchema))
    .optional(),
});

const updateCampaignSchema = createCampaignSchema.partial();

const listCampaignsQuerySchema = z.object({
  status: z
    .enum(["DRAFT", "PENDING", "REVIEWED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"])
    .optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const setManagersSchema = z.object({
  userIds: z.array(z.union([z.string(), z.number()])).max(50),
});

const campaignStatusSchema = z.object({
  // ACTIVE = resume a PAUSED campaign (admin, direct).
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]),
});

// A CAMPAIGN_MANAGER asks to suspend (PAUSE) or resume a campaign; the request
// clears the two-stage chain (REVIEWER then ORG_ADMIN) before it takes effect.
const statusChangeRequestSchema = z.object({
  action: z.enum(["PAUSE", "RESUME"]),
  reason: z.string().max(2000).optional(),
});

const targetExpectedSchema = z.object({
  expectedAmount: amountSchema.nullable().optional(),
});

const featuredSchema = z.object({
  featured: z.boolean(),
});

const translationsSchema = z.object({
  nameSw: z.string().min(3).max(150).optional().or(z.literal("")),
  storySw: z.string().max(20000).optional().or(z.literal("")),
  categorySw: z.string().max(100).optional().or(z.literal("")),
});

const completionReportSchema = z.object({
  summary: z
    .string()
    .min(20, "Describe how the funds were used (at least 20 characters)")
    .max(10000),
  // multipart fields arrive as strings; z.coerce handles the conversion.
  amountUtilized: z.coerce.number().int().min(0).optional(),
});

// Shared shape for the three-outcome review actions (fee proposal, completion
// report, closure request, campaign change request): 'approve' needs no note;
// 'request_changes' and 'reject' both require a reason of >= 10 chars.
const reviewDecisionSchema = z
  .object({
    action: z.enum(["approve", "request_changes", "reject"]).optional(),
    approved: z.boolean().optional(), // legacy callers
    notes: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    const action = val.action || (val.approved === true ? "approve" : val.approved === false ? "reject" : undefined);
    if (!action) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "An action is required", path: ["action"] });
      return;
    }
    if ((action === "request_changes" || action === "reject") && (!val.notes || val.notes.trim().length < 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A reason of at least 10 characters is required",
        path: ["notes"],
      });
    }
  });

const completionReportReviewSchema = reviewDecisionSchema;

const closureRequestSchema = z.object({
  reason: z.string().min(10, "Explain why this campaign should close (at least 10 characters)").max(5000),
});

const closureDecisionSchema = reviewDecisionSchema;

// REVIEWER/ORG_ADMIN/SUPER_ADMIN rejecting a campaign still awaiting approval
// (PENDING or REVIEWED) — reason is now mandatory (shown back to the manager).
const rejectCampaignSchema = z.object({
  notes: z.string().min(10, "A rejection reason of at least 10 characters is required").max(2000),
});

// Reviewer/admin sending a campaign back to the manager to fix (non-terminal).
const requestChangesSchema = z.object({
  notes: z.string().min(10, "A note of at least 10 characters is required").max(2000),
});

// Deciding an open campaign_change_requests row.
const changeRequestDecisionSchema = reviewDecisionSchema;

// A reviewer/admin deciding a manager's proposed custom fee %.
const feeReviewSchema = reviewDecisionSchema;

// Recording an in-kind gift against a campaign.
const createGiftSchema = z.object({
  description: z.string().min(1, "A short description is required").max(300),
  estimatedValue: z
    .number({ message: "Estimated value must be a number" })
    .int("Estimated value must be a whole TZS number")
    .min(0, "Estimated value cannot be negative")
    .max(1_000_000_000_000)
    .optional()
    .default(0),
  donorId: z.union([z.string(), z.number()]).optional(),
  receivedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, "Use a YYYY-MM-DD date")
    .optional()
    .or(z.literal("")),
});

const publicListQuerySchema = z.object({
  featured: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(5).optional(),
  locale: z.enum(["en", "sw"]).optional().default("en"),
});

const publicDetailQuerySchema = z.object({
  locale: z.enum(["en", "sw"]).optional().default("en"),
});

module.exports = {
  createCampaignSchema,
  updateCampaignSchema,
  listCampaignsQuerySchema,
  setManagersSchema,
  campaignStatusSchema,
  statusChangeRequestSchema,
  poolExpectedSchema,
  targetExpectedSchema,
  featuredSchema,
  translationsSchema,
  completionReportSchema,
  completionReportReviewSchema,
  closureRequestSchema,
  closureDecisionSchema,
  rejectCampaignSchema,
  requestChangesSchema,
  changeRequestDecisionSchema,
  feeReviewSchema,
  createGiftSchema,
  publicListQuerySchema,
  publicDetailQuerySchema,
};
