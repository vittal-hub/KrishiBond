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

// No fixed length is mandated by any real Indian bank - account numbers in
// practice range roughly 9-18 digits depending on the bank. Digits only, no
// spaces/letters/symbols.
const ACCOUNT_NUMBER_PATTERN = /^\d{9,18}$/;
const IFSC_PATTERN = /^[A-Za-z]{4}0[A-Z0-9]{6}$/;

// Bank details are supplied directly with each withdrawal request (no
// separate "add and wait for admin verification" step - see the wallet
// controller for why). A returning user can instead pass `useSavedAccount`
// to reuse whatever they previously chose to save, so they don't have to
// retype their details every time.
const initiateWithdrawalSchema = z.object({
  body: z
    .object({
      amount: z
        .number({ invalid_type_error: 'Enter a valid amount' })
        .positive('Amount must be greater than 0')
        .min(MIN_WITHDRAWAL, `Minimum withdrawal is ₹${MIN_WITHDRAWAL}`)
        .finite('Enter a valid amount'),
      useSavedAccount: z.boolean().optional(),
      accountHolderName: z.string().trim().min(2, 'Enter the account holder name').max(100, 'Name is too long').optional(),
      accountNumber: z.string().trim().regex(ACCOUNT_NUMBER_PATTERN, 'Please enter a valid bank account number').optional(),
      confirmAccountNumber: z.string().trim().optional(),
      ifscCode: z.string().trim().regex(IFSC_PATTERN, 'Enter a valid IFSC code').optional(),
      saveAccount: z.boolean().optional(),
    })
    .refine((b) => b.useSavedAccount || Boolean(b.accountHolderName && b.accountNumber && b.ifscCode), {
      message: 'Enter your bank account details',
      path: ['accountNumber'],
    })
    .refine((b) => b.useSavedAccount || b.accountNumber === b.confirmAccountNumber, {
      message: 'Account numbers do not match',
      path: ['confirmAccountNumber'],
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
  ACCOUNT_NUMBER_PATTERN,
  IFSC_PATTERN,
};
