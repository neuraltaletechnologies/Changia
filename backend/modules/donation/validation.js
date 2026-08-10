const { z } = require("zod");

const listDonationsQuerySchema = z.object({
  campaignId: z.union([z.string(), z.number()]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const createPaymentAttemptSchema = z.object({
  donorId: z.union([z.string(), z.number()]).optional(),
  donorPhone: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number")
    .optional(),
  donorName: z.string().max(150).optional(),
  amount: z
    .number({ message: "Amount must be a number" })
    .int("Amount must be a whole TZS number")
    .positive("Amount must be greater than zero"),
});

const simulateCallbackSchema = z.object({
  attemptId: z.union([z.string(), z.number()]),
  result: z.object({
    status: z.enum(["SUCCESS", "FAILED", "EXPIRED", "CANCELLED"]),
    gatewayRef: z.string().optional(),
  }),
});

module.exports = {
  listDonationsQuerySchema,
  createPaymentAttemptSchema,
  simulateCallbackSchema,
};
