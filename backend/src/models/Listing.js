const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cropType: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true },
    unit: { type: String, enum: ['kg', 'quintal', 'ton'], default: 'quintal' },
    pricePerUnit: { type: Number, required: true },
    location: {
      state: String,
      district: String,
    },
    description: { type: String, trim: true },
    availableFrom: { type: Date },
    status: { type: String, enum: ['open', 'matched', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

listingSchema.index({ cropType: 1, 'location.state': 1, 'location.district': 1 });

module.exports = mongoose.model('Listing', listingSchema);
