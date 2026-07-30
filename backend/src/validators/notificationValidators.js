const { z } = require('zod');

const CATEGORIES = ['contract', 'payment', 'offer', 'kyc', 'dispute', 'message', 'system'];

const updatePreferencesSchema = z.object({
  body: z.object({
    email: z.record(z.enum(CATEGORIES), z.boolean()).optional(),
  }),
});

module.exports = { updatePreferencesSchema };
