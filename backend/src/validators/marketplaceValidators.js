const { z } = require('zod');

const createListingSchema = z.object({
  body: z.object({
    cropType: z.string().min(2),
    category: z.string().optional(),
    quantity: z.number().positive(),
    unit: z.enum(['kg', 'quintal', 'ton']).optional(),
    pricePerUnit: z.number().positive(),
    expectedYield: z.number().positive().optional(),
    harvestDate: z.string().optional(),
    organic: z.boolean().optional(),
    storageFacility: z.boolean().optional(),
    deliveryAvailable: z.boolean().optional(),
    location: z.object({ state: z.string().optional(), district: z.string().optional() }).optional(),
    description: z.string().optional(),
    availableFrom: z.string().optional(),
  }),
});

const updateListingSchema = z.object({
  body: createListingSchema.shape.body.partial(),
});

module.exports = { createListingSchema, updateListingSchema };
