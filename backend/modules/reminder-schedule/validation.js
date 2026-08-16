const { z } = require("zod");

const idSchema = z.union([z.string(), z.number()]);
const channelsSchema = z.array(z.enum(["SMS", "WHATSAPP", "EMAIL"])).min(1).max(3);

const createScheduleSchema = z
  .object({
    name: z.string().min(2, "Schedule name is required").max(150),
    scope: z.enum(["POOL", "CAMPAIGN"]),
    poolId: idSchema.optional(),
    campaignId: idSchema.optional(),
    intervalDays: z.coerce.number().int().min(1).max(365).default(7),
    channels: channelsSchema,
    templateIdSms: idSchema.optional(),
    templateIdWhatsapp: idSchema.optional(),
    templateIdEmail: idSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => (d.scope === "POOL" ? Boolean(d.poolId) : Boolean(d.campaignId)), {
    message: "Provide poolId for a POOL schedule or campaignId for a CAMPAIGN schedule",
    path: ["poolId"],
  });

const updateScheduleSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  intervalDays: z.coerce.number().int().min(1).max(365).optional(),
  channels: channelsSchema.optional(),
  templateIdSms: idSchema.nullable().optional(),
  templateIdWhatsapp: idSchema.nullable().optional(),
  templateIdEmail: idSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});

const listSchedulesQuerySchema = z.object({
  scope: z.enum(["POOL", "CAMPAIGN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = { createScheduleSchema, updateScheduleSchema, listSchedulesQuerySchema };
