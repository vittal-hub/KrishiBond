const { z } = require('zod');
const { locationSchema } = require('./locationSchema');

const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().min(6).optional(),
    bio: z.string().max(500).optional(),
    location: locationSchema,
  }),
});

module.exports = { updateMeSchema };
