const { z } = require("zod");

const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  email: z.string().email().toLowerCase().optional(),
  phone: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number")
    .optional(),
  address: z.string().max(250).optional(),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  defaultServiceFeePercent: z.number().min(0).max(100).optional(),
});

module.exports = { updateOrganizationSchema };
