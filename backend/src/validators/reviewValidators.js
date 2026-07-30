const { z } = require('zod');

const createReviewSchema = z.object({
  body: z.object({
    contractId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  }),
});

const respondReviewSchema = z.object({
  body: z.object({
    text: z.string().min(1).max(1000),
  }),
});

module.exports = { createReviewSchema, respondReviewSchema };
