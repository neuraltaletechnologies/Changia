const { z } = require("zod");

const createCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name is required").max(150),
  story: z.string().max(20000).optional(),
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

module.exports = {
  createCampaignSchema,
  updateCampaignSchema,
  listCampaignsQuerySchema,
  setManagersSchema,
  campaignStatusSchema,
};
