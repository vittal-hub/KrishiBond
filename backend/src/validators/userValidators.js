const { z } = require('zod');

const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().min(6).optional(),
    bio: z.string().max(500).optional(),
    location: z.object({
      state: z.string().min(1).optional(),
      district: z.string().min(1).optional(),
    }).optional(),
  }),
});

module.exports = { updateMeSchema };
