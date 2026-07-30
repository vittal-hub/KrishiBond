const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    cropType: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true },
    unit: { type: String, enum: ['kg', 'quintal', 'ton'], default: 'quintal' },
    pricePerUnit: { type: Number, required: true },
    expectedYield: { type: Number },
    harvestDate: { type: Date },
    organic: { type: Boolean, default: false },
    storageFacility: { type: Boolean, default: false },
    deliveryAvailable: { type: Boolean, default: false },
    location: {
      state: String,
      district: String,
    },
    description: { type: String, trim: true },
    availableFrom: { type: Date },
    status: { type: String, enum: ['open', 'matched', 'closed'], default: 'open' },
    images: { type: [String], default: [] },
    qualityCertificates: { type: [String], default: [] },
    favouritedBy: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  { timestamps: true }
);

listingSchema.index({ cropType: 1, 'location.state': 1, 'location.district': 1 });
listingSchema.index({ cropType: 'text', description: 'text' });
listingSchema.index({ favouritedBy: 1 });

module.exports = mongoose.model('Listing', listingSchema);
