const { z } = require("zod");

const createTemplateSchema = z.object({
  name: z.string().min(2, "Template name is required").max(150),
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL"]),
  subject: z.string().max(255).optional().or(z.literal("")),
  body: z.string().min(1, "Message body is required").max(5000),
});

const updateTemplateSchema = createTemplateSchema.partial();

const listTemplatesQuerySchema = z.object({
  channel: z.enum(["SMS", "WHATSAPP", "EMAIL"]).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = { createTemplateSchema, updateTemplateSchema, listTemplatesQuerySchema };
