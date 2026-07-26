const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    payee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['held', 'released', 'refunded'], default: 'held' },
    escrowRef: { type: String },
    releasedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
