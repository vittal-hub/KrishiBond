const { z } = require('zod');
const { locationSchema } = require('./locationSchema');
const { emailSchema, phoneSchema, nameSchema } = require('./commonSchemas');

const registerSchema = z.object({
  body: z.object({
    name: nameSchema,
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['farmer', 'buyer']),
    phone: phoneSchema,
    location: locationSchema,
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({ email: emailSchema }),
});

const resetPasswordSchema = z.object({
  params: z.object({ token: z.string().min(1) }),
  body: z.object({ password: z.string().min(8, 'Password must be at least 8 characters') }),
});

const OTP_CODE_REGEX = /^\d{6}$/;

const verifyEmailOtpSchema = z.object({
  body: z.object({
    email: emailSchema,
    otp: z.string().regex(OTP_CODE_REGEX, 'OTP must be a 6-digit code'),
  }),
});

const resendEmailOtpSchema = z.object({
  body: z.object({ email: emailSchema }),
});

const verifyOtpSchema = z.object({
  body: z.object({ otp: z.string().regex(OTP_CODE_REGEX, 'OTP must be a 6-digit code') }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailOtpSchema,
  resendEmailOtpSchema,
  verifyOtpSchema,
};
