const { z } = require("zod");

const createUserSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().toLowerCase(),
  phone: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number")
    .optional(),
  role: z.enum(["ORG_ADMIN", "CAMPAIGN_MANAGER"]),
});

const updateUserSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number")
    .optional(),
  role: z.enum(["ORG_ADMIN", "CAMPAIGN_MANAGER"]).optional(),
  status: z.enum(["ACTIVE", "PENDING", "INACTIVE"]).optional(),
});

const listUsersQuerySchema = z.object({
  search: z.string().max(100).optional(),
  role: z.enum(["ORG_ADMIN", "CAMPAIGN_MANAGER"]).optional(),
  status: z.enum(["ACTIVE", "PENDING", "INACTIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

module.exports = { createUserSchema, updateUserSchema, listUsersQuerySchema };
