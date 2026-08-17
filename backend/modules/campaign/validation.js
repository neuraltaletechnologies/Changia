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
  poolIds: z.array(poolIdSchema).max(50).optional(),
  expectedAmounts: z
    .record(z.string(), z.record(z.string(), amountSchema))
    .optional(),
});

const updateCampaignSchema = createCampaignSchema.partial();

const listCampaignsQuerySchema = z.object({
  status: z
    .enum(["DRAFT", "PENDING", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"])
    .optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const setManagersSchema = z.object({
  userIds: z.array(z.union([z.string(), z.number()])).max(50),
});

const campaignStatusSchema = z.object({
  status: z.enum(["PAUSED", "COMPLETED", "CANCELLED"]),
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
  poolExpectedSchema,
  targetExpectedSchema,
  featuredSchema,
  translationsSchema,
  publicListQuerySchema,
  publicDetailQuerySchema,
};
