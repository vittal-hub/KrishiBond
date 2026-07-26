const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['farmer', 'buyer']),
    phone: z.string().optional(),
    location: z.object({ state: z.string().optional(), district: z.string().optional() }).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().email() }),
});

const resetPasswordSchema = z.object({
  body: z.object({ token: z.string().min(1), password: z.string().min(6) }),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
