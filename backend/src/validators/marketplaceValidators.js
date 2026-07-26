const { z } = require('zod');

const createListingSchema = z.object({
  body: z.object({
    cropType: z.string().min(2),
    quantity: z.number().positive(),
    unit: z.enum(['kg', 'quintal', 'ton']).optional(),
    pricePerUnit: z.number().positive(),
    location: z.object({ state: z.string().optional(), district: z.string().optional() }).optional(),
    description: z.string().optional(),
    availableFrom: z.string().optional(),
  }),
});

const updateListingSchema = z.object({
  body: createListingSchema.shape.body.partial(),
});

module.exports = { createListingSchema, updateListingSchema };
