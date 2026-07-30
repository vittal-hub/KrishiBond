const { z } = require('zod');

const createFaqSchema = z.object({
  body: z.object({
    question: z.string().min(3),
    answer: z.string().min(3),
    category: z.string().optional(),
  }),
});

const updateFaqSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: createFaqSchema.shape.body.partial(),
});

module.exports = { createFaqSchema, updateFaqSchema };
