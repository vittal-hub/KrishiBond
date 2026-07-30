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
    deliveryDate: z.string().optional(),
    terms: z.string().optional(),
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

const demoCompleteSchema = z.object({
  body: z.object({
    outcome: z.enum(['success', 'failed', 'pending']).optional(),
    method: z.enum(['upi', 'card', 'debit_card', 'netbanking', 'wallet']).optional(),
    reason: z.string().max(200).optional(),
  }),
});

const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }),
});

const releaseEscrowSchema = z.object({
  body: z.object({
    amount: z.number().positive().optional(),
  }),
});

const statusReasonSchema = z.object({
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

const signContractSchema = z.object({
  body: z.object({
    signatureName: z.string().min(2).optional(),
  }),
});

const clauseSchema = z.object({
  body: z.object({
    text: z.string().min(3).max(1000),
  }),
});

module.exports = {
  createContractSchema,
  createBidSchema,
  bidActionSchema,
  milestoneSchema,
  escrowFundSchema,
  demoCompleteSchema,
  statusReasonSchema,
  signContractSchema,
  clauseSchema,
  verifyPaymentSchema,
  releaseEscrowSchema,
};
