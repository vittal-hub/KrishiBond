const { z } = require('zod');

const MIN_TOPUP = 10;
const MAX_TOPUP = 100000;

const initiateTopupSchema = z.object({
  body: z.object({
    amount: z
      .number({ invalid_type_error: 'Enter a valid amount' })
      .positive('Amount must be greater than 0')
      .min(MIN_TOPUP, `Minimum top-up is ₹${MIN_TOPUP}`)
      .max(MAX_TOPUP, `Maximum top-up is ₹${MAX_TOPUP.toLocaleString('en-IN')}`)
      .finite('Enter a valid amount'),
  }),
});

const completeTopupSchema = z.object({
  body: z.object({
    outcome: z.enum(['success', 'failed', 'pending']).optional(),
    method: z.enum(['upi', 'card', 'debit_card', 'netbanking', 'wallet']).optional(),
  }),
});

const verifyTopupSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }),
});

module.exports = { initiateTopupSchema, completeTopupSchema, verifyTopupSchema, MIN_TOPUP, MAX_TOPUP };
