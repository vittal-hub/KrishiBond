const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    dueDate: Date,
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    completedAt: Date,
  },
  { _id: true }
);

const signatureSchema = new mongoose.Schema(
  {
    signedAt: Date,
    signatureName: String,
  },
  { _id: false }
);

const contractSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cropType: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, enum: ['kg', 'quintal', 'ton'], default: 'quintal' },
    agreedPricePerUnit: { type: Number },
    deliveryDate: { type: Date },
    terms: { type: String, trim: true },
    customClauses: { type: [String], default: [] },
    signatures: {
      farmer: { type: signatureSchema, default: () => ({}) },
      buyer: { type: signatureSchema, default: () => ({}) },
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'fulfilled', 'disputed', 'cancelled'],
      default: 'pending',
    },
    milestones: { type: [milestoneSchema], default: [] },
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true }
);

contractSchema.index({ farmer: 1, status: 1 });
contractSchema.index({ buyer: 1, status: 1 });

module.exports = mongoose.model('Contract', contractSchema);
