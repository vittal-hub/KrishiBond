const { z } = require('zod');

const createThreadSchema = z.object({
  body: z.object({
    recipientId: z.string().min(1),
    contractId: z.string().optional(),
    listingId: z.string().optional(),
  }),
});

const sendMessageSchema = z.object({
  body: z.object({
    body: z.string().min(1),
  }),
});

const raiseDisputeSchema = z.object({
  body: z.object({
    contractId: z.string().min(1),
    reason: z.string().min(5),
    evidenceUrls: z.array(z.string()).optional(),
  }),
});

const disputeCommentSchema = z.object({
  body: z.object({
    text: z.string().min(1),
  }),
});

const resolveDisputeSchema = z.object({
  body: z.object({
    status: z.enum(['under_review', 'resolved', 'rejected']),
    resolutionNote: z.string().min(3).optional(),
  }),
});

const supportTicketSchema = z.object({
  body: z.object({
    subject: z.string().min(2),
    message: z.string().min(5),
  }),
});

module.exports = {
  createThreadSchema,
  sendMessageSchema,
  raiseDisputeSchema,
  disputeCommentSchema,
  resolveDisputeSchema,
  supportTicketSchema,
};
