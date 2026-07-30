const { z } = require('zod');

const submitKycSchema = z.object({
  body: z.object({
    aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar number must be 12 digits').optional(),
    panNumber: z.string().regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, 'Enter a valid PAN number').optional(),
    bankDetails: z.object({
      accountHolderName: z.string().min(2).optional(),
      accountNumber: z.string().min(4).optional(),
      ifsc: z.string().regex(/^[A-Za-z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code').optional(),
    }).optional(),
  }),
});

const reviewKycSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    rejectionReason: z.string().min(3).optional(),
  }),
});

module.exports = { submitKycSchema, reviewKycSchema };
