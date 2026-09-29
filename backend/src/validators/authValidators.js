const { z } = require('zod');
const { locationSchema } = require('./locationSchema');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['farmer', 'buyer']),
    phone: z.string().optional(),
    location: locationSchema,
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().email() }),
});

const resetPasswordSchema = z.object({
  params: z.object({ token: z.string().min(1) }),
  body: z.object({ password: z.string().min(8, 'Password must be at least 8 characters') }),
});

const verifyEmailParamsSchema = z.object({
  params: z.object({ token: z.string().min(1) }),
});

const verifyOtpSchema = z.object({
  body: z.object({ otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code') }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailParamsSchema,
  verifyOtpSchema,
};
