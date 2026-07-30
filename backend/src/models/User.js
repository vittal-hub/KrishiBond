const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['farmer', 'buyer', 'admin'], required: true },
    phone: { type: String, trim: true },
    location: {
      state: String,
      district: String,
    },
    bio: { type: String, trim: true, maxlength: 500 },
    avatarUrl: { type: String },
    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },

    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    phoneVerified: { type: Boolean, default: false },
    otpHash: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },

    profileCompleted: { type: Boolean, default: false },

    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    notificationPreferences: {
      email: {
        contract: { type: Boolean, default: true },
        payment: { type: Boolean, default: true },
        offer: { type: Boolean, default: true },
        kyc: { type: Boolean, default: true },
        dispute: { type: Boolean, default: true },
        message: { type: Boolean, default: false },
        system: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model('User', userSchema);
