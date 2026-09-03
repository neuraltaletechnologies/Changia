const { z } = require("zod");

const createSchema = z.object({
  quote: z.string().trim().min(10).max(1000),
  author: z.string().trim().min(2).max(150),
  role: z.string().trim().min(2).max(200),
  photoUrl: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

const updateSchema = z
  .object({
    quote: z.string().trim().min(10).max(1000).optional(),
    author: z.string().trim().min(2).max(150).optional(),
    role: z.string().trim().min(2).max(200).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

const reorderSchema = z.object({
  ids: z.array(z.union([z.number().int().positive(), z.string().regex(/^\d+$/)])).min(1),
});

const idParamSchema = z.object({ id: z.string().regex(/^\d+$/) });

module.exports = { createSchema, updateSchema, reorderSchema, idParamSchema };
