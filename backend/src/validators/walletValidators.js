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

const MIN_WITHDRAWAL = 100;

// Upper bound enforced here is deliberately generous - the real ceiling on
// any given withdrawal is the wallet's actual available balance, checked
// atomically server-side against the database (see
// walletService.reserveWithdrawal), never trusted from the client.
const initiateWithdrawalSchema = z.object({
  body: z.object({
    amount: z
      .number({ invalid_type_error: 'Enter a valid amount' })
      .positive('Amount must be greater than 0')
      .min(MIN_WITHDRAWAL, `Minimum withdrawal is ₹${MIN_WITHDRAWAL}`)
      .finite('Enter a valid amount'),
  }),
});

const completeWithdrawalSchema = z.object({
  body: z.object({
    outcome: z.enum(['success', 'failed']).optional(),
  }),
});

module.exports = {
  initiateTopupSchema,
  completeTopupSchema,
  verifyTopupSchema,
  initiateWithdrawalSchema,
  completeWithdrawalSchema,
  MIN_TOPUP,
  MAX_TOPUP,
  MIN_WITHDRAWAL,
};
