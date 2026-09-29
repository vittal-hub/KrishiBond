const { z } = require('zod');
const { locationSchema } = require('./locationSchema');
const { phoneSchema, nameSchema } = require('./commonSchemas');

const updateMeSchema = z.object({
  body: z.object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    bio: z.string().max(500).optional(),
    location: locationSchema,
  }),
});

module.exports = { updateMeSchema };
