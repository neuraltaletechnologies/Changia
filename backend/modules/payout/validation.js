const { z } = require("zod");

const amount = z.number().int().positive().max(1_000_000_000_000);
const listSchema = z.object({
  status: z.enum(["REQUESTED", "REVIEWED", "APPROVED", "PAID", "REJECTED"]).optional(),
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
const paidSchema = z.object({
  gatewayRef: z.string().max(255).optional(),
  phoneNumber: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number")
    .optional(),
  notes: z.string().max(2000).optional(),
});

const previewSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number"),
});

const tzPhone = z
  .string()
  .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number");

// Payout destination ("checkout"). Method-specific fields are enforced with a
// refine so the client gets one clear message per missing field.
const checkoutSchema = z
  .object({
    method: z.enum(["MOBILE_MONEY", "BANK"]),
    accountName: z.string().trim().min(2, "Enter the account holder's name").max(120),
    // Mobile money
    provider: z.string().trim().min(2).max(40).optional(),
    phone: tzPhone.optional(),
    // Bank
    bankName: z.string().trim().min(2).max(120).optional(),
    accountNumber: z.string().trim().min(4).max(40).optional(),
    branch: z.string().trim().max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === "MOBILE_MONEY") {
      if (!data.provider)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["provider"], message: "Choose the mobile money provider" });
      if (!data.phone)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Enter the mobile money number" });
    } else {
      if (!data.bankName)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankName"], message: "Enter the bank name" });
      if (!data.accountNumber)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accountNumber"], message: "Enter the bank account number" });
    }
  });

module.exports = { listSchema, createSchema, decisionSchema, paidSchema, previewSchema, checkoutSchema };
