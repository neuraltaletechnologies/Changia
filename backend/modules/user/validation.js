const { z } = require("zod");

const ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "REVIEWER", "CAMPAIGN_MANAGER"];

const createUserSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().toLowerCase(),
  phone: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number")
    .optional(),
  role: z.enum(ROLES),
  organizationId: z.coerce.number().int().positive().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z
    .string()
    .regex(/^(\+?255|0)?[67][0-9]{8}$/, "Enter a valid Tanzanian phone number")
    .optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(["ACTIVE", "PENDING", "INACTIVE"]).optional(),
});

const listUsersQuerySchema = z.object({
  search: z.string().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(["ACTIVE", "PENDING", "INACTIVE"]).optional(),
  organizationId: z.coerce.number().int().positive().optional(),
  sortBy: z
    .enum(["name", "email", "role", "status", "created", "lastLogin"])
    .default("created"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

module.exports = { createUserSchema, updateUserSchema, listUsersQuerySchema };