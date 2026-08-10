const { z } = require("zod");

const createDonorSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().toLowerCase().optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number"),
  location: z.string().max(200).optional(),
  status: z.enum(["ACTIVE", "PROSPECT", "LAPSED", "INACTIVE"]).optional(),
  consentStatus: z.enum(["CONSENTED", "PENDING", "WITHDRAWN"]).optional(),
  preferredChannel: z.enum(["SMS", "WHATSAPP", "EMAIL", "PHONE"]).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(5000).optional(),
});

const updateDonorSchema = createDonorSchema.partial();

const listDonorsQuerySchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(["ACTIVE", "PROSPECT", "LAPSED", "INACTIVE"]).optional(),
  consent: z.enum(["CONSENTED", "PENDING", "WITHDRAWN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

module.exports = { createDonorSchema, updateDonorSchema, listDonorsQuerySchema };
