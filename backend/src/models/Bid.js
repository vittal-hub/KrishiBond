const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pricePerUnit: { type: Number, required: true },
    quantity: { type: Number, required: true },
    message: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'countered'], default: 'pending' },
  },
  { timestamps: true }
);

bidSchema.index({ contract: 1, createdAt: -1 });

module.exports = mongoose.model('Bid', bidSchema);
