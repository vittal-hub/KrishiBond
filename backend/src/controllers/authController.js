const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { toUserDTO } = require('../utils/dto');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/token');
const { jwt: jwtConfig } = require('../config/env');

function msFromExpiry(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return value * unit;
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, tokenId } = signRefreshToken(user);
  const expiresAt = new Date(Date.now() + msFromExpiry(jwtConfig.refreshExpiresIn));

  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push({ tokenId, expiresAt });
  // Keep only the 5 most recent sessions
  user.refreshTokens = user.refreshTokens.slice(-5);
  await user.save();

  return { accessToken, refreshToken };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, location } = req.body;
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  const user = await User.create({ name, email, password, role, phone, location });
  const { accessToken, refreshToken } = await issueTokens(user);

  res.status(201).json({ success: true, user: toUserDTO(user), accessToken, refreshToken });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const { accessToken, refreshToken } = await issueTokens(user);
  res.json({ success: true, user: toUserDTO(user), accessToken, refreshToken });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user) throw new ApiError(401, 'User no longer exists');

  const hasToken = user.refreshTokens.some((t) => t.tokenId === payload.tokenId);
  if (!hasToken) throw new ApiError(401, 'Refresh token has been revoked');

  // Rotate: remove old, issue new pair
  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenId !== payload.tokenId);
  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user);

  res.json({ success: true, accessToken, refreshToken: newRefreshToken });
});

const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+refreshTokens');
  user.refreshTokens = [];
  await user.save();
  res.json({ success: true, message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: toUserDTO(req.user) });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  // Always respond success to avoid leaking which emails are registered
  if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  // In production this would be emailed; returned here for local/dev testing only.
  res.json({
    success: true,
    message: 'If that email exists, a reset link has been sent',
    devResetToken: process.env.NODE_ENV === 'production' ? undefined : token,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) throw new ApiError(400, 'Reset token is invalid or has expired');

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshTokens = [];
  await user.save();

  res.json({ success: true, message: 'Password has been reset, please log in again' });
});

module.exports = { register, login, refresh, logout, me, forgotPassword, resetPassword };
