const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    payee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    convenienceFee: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'held', 'released', 'refunded', 'failed'], default: 'held' },
    escrowRef: { type: String },
    gateway: { type: String, enum: ['stub', 'razorpay', 'demo'], default: 'stub' },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    method: { type: String, enum: ['upi', 'card', 'debit_card', 'netbanking', 'wallet'] },
    receiptNumber: { type: String },
    failureReason: { type: String },
    paidAt: Date,
    releasedAt: Date,
    refundedAt: Date,
  },
  { timestamps: true }
);

paymentSchema.index({ contract: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
