const { z } = require('zod');

const createContractSchema = z.object({
  body: z.object({
    listingId: z.string().optional(),
    buyerId: z.string().optional(),
    farmerId: z.string().optional(),
    cropType: z.string().min(2),
    quantity: z.number().positive(),
    unit: z.enum(['kg', 'quintal', 'ton']).optional(),
    agreedPricePerUnit: z.number().positive().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

const createBidSchema = z.object({
  body: z.object({
    pricePerUnit: z.number().positive(),
    quantity: z.number().positive(),
    message: z.string().optional(),
  }),
});

const bidActionSchema = z.object({
  body: z.object({
    action: z.enum(['accept', 'reject']),
  }),
});

const milestoneSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    dueDate: z.string().optional(),
  }),
});

const escrowFundSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
  }),
});

module.exports = {
  createContractSchema,
  createBidSchema,
  bidActionSchema,
  milestoneSchema,
  escrowFundSchema,
};
