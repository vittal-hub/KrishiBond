const { z } = require('zod');

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: createCategorySchema.shape.body.partial(),
});

module.exports = { createCategorySchema, updateCategorySchema };
