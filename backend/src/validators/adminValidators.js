const { z } = require('zod');

const suspendUserSchema = z.object({
  body: z.object({
    reason: z.string().min(3).optional(),
  }),
});

const updateTicketSchema = z.object({
  body: z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
    response: z.string().trim().min(1).max(2000).optional(),
  }),
});

const updatePaymentStatusSchema = z.object({
  body: z.object({
    status: z.enum(['held', 'refunded', 'failed']),
  }),
});

module.exports = { suspendUserSchema, updateTicketSchema, updatePaymentStatusSchema };
