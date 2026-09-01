const { z } = require("zod");

const POOL_CATEGORIES = [
  "FAMILY",
  "SCHOOL",
  "STUDENT",
  "OFFICE",
  "ALUMNI",
  "COMMUNITY",
  "CHURCH",
  "BUSINESS",
  "FRIENDS",
  "OTHER",
];

const poolIdSchema = z.union([z.string(), z.number()]);
const amountSchema = z
  .number({ message: "Amount must be a number" })
  .int("Amount must be a whole TZS number")
  .min(0, "Amount cannot be negative");

const createPoolSchema = z.object({
  name: z.string().min(2, "Pool name is required").max(150),
  description: z.string().max(2000).optional().or(z.literal("")),
  category: z.enum(POOL_CATEGORIES).optional(),
  createdBy: poolIdSchema.optional(),
});

const updatePoolSchema = createPoolSchema.partial();

const listPoolsQuerySchema = z.object({
  category: z.enum(POOL_CATEGORIES).optional(),
  search: z.string().max(100).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  createdBy: poolIdSchema.optional(),
  sortBy: z.enum(["name", "created", "members"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const memberDonorSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().toLowerCase().optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number"),
  location: z.string().max(200).optional(),
  gender: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]).optional(),
  position: z.string().max(150).optional(),
  status: z.enum(["ACTIVE", "PROSPECT", "LAPSED", "INACTIVE"]).optional(),
  consentStatus: z.enum(["CONSENTED", "PENDING", "WITHDRAWN"]).optional(),
  preferredChannel: z.enum(["SMS", "WHATSAPP", "EMAIL", "PHONE"]).optional(),
  notes: z.string().max(5000).optional(),
});

const addMembersSchema = z.object({
  donorIds: z.array(poolIdSchema).optional(),
  donors: z.array(memberDonorSchema).max(100).optional(),
  expectedAmounts: z.record(z.string(), amountSchema).optional(),
});

const setExpectedSchema = z.object({
  expectedAmount: amountSchema.nullable().optional(),
});

const resolveDuplicatesSchema = z.object({
  choices: z
    .array(
      z.object({
        donorId: poolIdSchema,
        keepPoolId: poolIdSchema,
      })
    )
    .min(1)
    .max(200),
});

const mergeAnomalousSchema = z.object({
  targetDonorId: poolIdSchema,
  paymentMethod: z
    .object({
      method: z.enum([
        "MOMO",
        "TIGO_PESA",
        "AIRTEL_MONEY",
        "HALOPESA",
        "BANK_TRANSFER",
        "CREDIT_CARD",
        "CASH",
        "OTHER",
      ]),
      accountRef: z.string().max(100).optional().or(z.literal("")),
      details: z.record(z.string()).optional(),
    })
    .optional(),
});

const reminderChannelEnum = z.enum(["SMS", "WHATSAPP", "EMAIL"]);

const reminderSchema = z
  .object({
    campaignId: poolIdSchema,
    donorIds: z.array(poolIdSchema).min(1, "Select at least one donor").max(500),
    // Single-channel mode: every donor is messaged on `channel` with `message`.
    channel: reminderChannelEnum.optional(),
    subject: z.string().max(255).optional().or(z.literal("")),
    message: z.string().max(5000).optional().or(z.literal("")),
    // Preferred-channel mode: each donor is messaged on their own
    // preferred_channel, rendered from a per-channel saved template. Donors
    // whose preferred channel has no usable contact / template fall back to
    // `fallbackChannel`.
    usePreferredChannel: z.boolean().optional(),
    fallbackChannel: reminderChannelEnum.optional(),
    templates: z.record(reminderChannelEnum, poolIdSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.usePreferredChannel) {
      if (!data.templates || Object.keys(data.templates).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["templates"],
          message: "Pick a template for each channel your donors will receive.",
        });
      }
      return;
    }
    if (!data.channel) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["channel"], message: "Channel is required" });
    }
    if (!data.message || data.message.trim().length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["message"], message: "Message is required" });
    }
  });

module.exports = {
  POOL_CATEGORIES,
  createPoolSchema,
  updatePoolSchema,
  listPoolsQuerySchema,
  addMembersSchema,
  setExpectedSchema,
  resolveDuplicatesSchema,
  mergeAnomalousSchema,
  reminderSchema,
  memberDonorSchema,
};