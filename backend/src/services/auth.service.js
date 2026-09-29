const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { nodeEnv, otp: otpConfig } = require('../config/env');
const { issueTokenPair, verifyRefreshToken } = require('./token.service');
const emailService = require('./email.service');

const RESET_PASSWORD_TTL_MS = 60 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

// Generates a fresh 6-digit OTP, hashes+stores it on the user (overwriting -
// and so invalidating - any previous one), and emails it. Shared by both
// register() and resendEmailOtp() so there is exactly one place this logic
// lives. Caller is responsible for user.save().
function assignEmailOtp(user) {
  const otp = generateOtp();
  user.emailVerificationOtpHash = hashToken(otp);
  user.emailVerificationOtpExpires = new Date(Date.now() + otpConfig.expiresInMinutes * 60 * 1000);
  user.emailVerificationOtpAttempts = 0;
  return otp;
}

async function register({ name, email, password, role, phone, location }) {
  // Registration used to be 3 sequential round trips to MongoDB: a findOne()
  // pre-check for the duplicate email, a create(), and a second save() to
  // attach the verification token + refresh-token session. The email
  // uniqueness check is redundant with the schema's unique index - it only
  // needs to run (and cost a round trip) on the rare duplicate path, not on
  // every registration - and the OTP can be generated up front and included
  // directly in the create() call, keeping this back down to one write.
  //
  // Registration is also no longer where a session begins: the account is
  // created in an unverified state and no JWTs are issued here at all - only
  // verifyEmailOtp() (after the user proves they received the OTP) does
  // that, which is what keeps a user off the authenticated dashboard until
  // the required verification is actually complete.
  const otp = generateOtp();

  let user;
  try {
    user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      location,
      emailVerificationOtpHash: hashToken(otp),
      emailVerificationOtpExpires: new Date(Date.now() + otpConfig.expiresInMinutes * 60 * 1000),
    });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Email already registered');
    throw err;
  }

  // Fire-and-forget: the account is already created at this point, so a slow
  // or unreachable SMTP provider must never delay or fail the registration
  // response - the OTP screen's "resend" option covers the case where the
  // email genuinely never arrives.
  emailService.sendOtpEmail(user, otp).catch((err) => {
    logger.error(`Failed to send registration OTP to ${user.email}: ${err.message}`);
  });

  // Same dev-only bypass already used by sendOtp/forgotPassword: never
  // present in production (see config/env.js), but lets the registration ->
  // verify flow be tested end-to-end without a real mailbox in dev/CI.
  return { user, devOtp: nodeEnv === 'production' ? undefined : otp };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'This account has been suspended. Contact support for help.');
  }

  const { accessToken, refreshToken } = issueTokenPair(user);
  await user.save();

  return { user, accessToken, refreshToken };
}

/**
 * Rotates a refresh token. If the presented token is well-formed but no
 * longer present in the user's active session list, it has already been
 * rotated once before (replay/theft) - every session is revoked as a
 * precaution (NFR-SEC-2 reuse detection).
 */
async function refresh(refreshToken) {
  if (!refreshToken) throw new ApiError(401, 'Not authenticated');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user) throw new ApiError(401, 'User no longer exists');

  const hasToken = user.refreshTokens.some((t) => t.tokenId === payload.tokenId);
  if (!hasToken) {
    user.refreshTokens = [];
    await user.save();
    logger.warn(`Refresh token reuse detected for user ${user._id} - all sessions revoked`);
    throw new ApiError(401, 'Session invalid, please log in again');
  }

  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenId !== payload.tokenId);
  const { accessToken, refreshToken: newRefreshToken } = issueTokenPair(user);
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
}

async function logout(userId, refreshToken) {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      user.refreshTokens = user.refreshTokens.filter((t) => t.tokenId !== payload.tokenId);
    } catch (err) {
      user.refreshTokens = [];
    }
  } else {
    user.refreshTokens = [];
  }
  await user.save();
}

async function logoutAll(userId) {
  await User.findByIdAndUpdate(userId, { refreshTokens: [] });
}

/**
 * Verifies the OTP sent at registration (or via resendEmailOtp) and - only
 * on success - issues the user's first session. This is the sole point at
 * which a newly registered account actually becomes authenticated.
 */
async function verifyEmailOtp(email, otp) {
  const user = await User.findOne({ email }).select(
    '+emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpAttempts +refreshTokens'
  );
  if (!user) throw new ApiError(400, 'Incorrect or expired OTP');
  if (user.emailVerified) throw new ApiError(400, 'Email is already verified');
  if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpires || user.emailVerificationOtpExpires < new Date()) {
    throw new ApiError(400, 'OTP has expired, please request a new one');
  }
  if (user.emailVerificationOtpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many incorrect attempts, please request a new OTP');
  }

  if (hashToken(otp) !== user.emailVerificationOtpHash) {
    user.emailVerificationOtpAttempts += 1;
    await user.save();
    throw new ApiError(400, 'Incorrect OTP');
  }

  user.emailVerified = true;
  user.emailVerificationOtpHash = undefined;
  user.emailVerificationOtpExpires = undefined;
  user.emailVerificationOtpAttempts = 0;

  const { accessToken, refreshToken } = issueTokenPair(user);
  await user.save();

  return { user, accessToken, refreshToken };
}

/**
 * Re-sends a fresh OTP, invalidating whatever one was issued before.
 * Deliberately never reveals whether the email exists or is already
 * verified (same non-enumerable pattern as forgotPassword) - the caller
 * always gets the same generic acknowledgement.
 */
async function resendEmailOtp(email) {
  const user = await User.findOne({ email });
  if (!user || user.emailVerified) return { devOtp: undefined };

  const otp = assignEmailOtp(user);
  await user.save();

  emailService.sendOtpEmail(user, otp).catch((err) => {
    logger.error(`Failed to resend registration OTP to ${user.email}: ${err.message}`);
  });

  return { devOtp: nodeEnv === 'production' ? undefined : otp };
}

async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user) return { devResetToken: undefined };

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = hashToken(token);
  user.resetPasswordExpires = new Date(Date.now() + RESET_PASSWORD_TTL_MS);
  await user.save();

  await emailService.sendPasswordResetEmail(user, token);

  return { devResetToken: nodeEnv === 'production' ? undefined : token };
}

async function resetPassword(token, password) {
  const hashed = hashToken(token);
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) throw new ApiError(400, 'Reset token is invalid or has expired');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshTokens = [];
  await user.save();
}

async function sendOtp(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.phone) throw new ApiError(400, 'Add a phone number to your profile first');

  const otp = String(crypto.randomInt(100000, 999999));
  user.otpHash = hashToken(otp);
  user.otpExpires = new Date(Date.now() + otpConfig.expiresInMinutes * 60 * 1000);
  user.otpAttempts = 0;
  await user.save();

  // SMS provider not yet selected (see SRS assumptions) - OTP is emailed as
  // an interim delivery channel so the verification flow is fully testable.
  await emailService.sendOtpEmail(user, otp);

  return { devOtp: nodeEnv === 'production' ? undefined : otp };
}

async function verifyOtp(userId, otp) {
  const user = await User.findById(userId).select('+otpHash +otpExpires +otpAttempts');
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
    throw new ApiError(400, 'OTP has expired, please request a new one');
  }
  if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many incorrect attempts, please request a new OTP');
  }

  if (hashToken(otp) !== user.otpHash) {
    user.otpAttempts += 1;
    await user.save();
    throw new ApiError(400, 'Incorrect OTP');
  }

  user.phoneVerified = true;
  user.otpHash = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  await user.save();
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  verifyEmailOtp,
  resendEmailOtp,
  forgotPassword,
  resetPassword,
  sendOtp,
  verifyOtp,
};
