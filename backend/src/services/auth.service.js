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
  // Registration is a single round trip: create the account, then issue a
  // session immediately - the same shape as login(). There is no email/phone
  // OTP gate here; email/phone are still validated for format (see
  // authValidators/commonSchemas) but proving inbox/SMS access is no longer
  // a precondition for reaching the dashboard. A user can still optionally
  // verify their email later from their profile (see verifyEmailOtp/
  // resendEmailOtp below), which is a separate, non-blocking feature.
  let user;
  try {
    user = await User.create({ name, email, password, role, phone, location });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Email already registered');
    throw err;
  }

  const { accessToken, refreshToken } = issueTokenPair(user);
  await user.save();

  return { user, accessToken, refreshToken };
}

// Per-stage timing, logged only when the whole call is slow enough to matter
// (>1s) - this is what actually answers "which part is slow" instead of
// guessing, the next time a login is reported as taking several seconds.
// Logged at `warn` so it's visible in production (the logger drops `debug`
// there), but only on the slow path so normal logins stay silent.
async function login({ email, password }) {
  const t0 = Date.now();
  const user = await User.findOne({ email }).select('+password +refreshTokens');
  const t1 = Date.now();
  const passwordOk = user && (await user.comparePassword(password));
  const t2 = Date.now();
  if (!user || !passwordOk) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'This account has been suspended. Contact support for help.');
  }

  const { accessToken, refreshToken } = issueTokenPair(user);
  await user.save();
  const t3 = Date.now();

  const totalMs = t3 - t0;
  if (totalMs > 1000) {
    logger.warn(
      `Slow login for ${email} (role=${user.role}): ${totalMs}ms total - ` +
        `findUser=${t1 - t0}ms, comparePassword=${t2 - t1}ms, issueTokenAndSave=${t3 - t2}ms`
    );
  }

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

  // Fire-and-forget, same as register()'s OTP email: the reset token is
  // already saved at this point, so a slow/unreachable SMTP provider must
  // never delay (or fail) this response - the endpoint's job is just to
  // accept the request and start the email on its way. Previously this was
  // `await`ed, so a hung SMTP connection (no timeout was configured on the
  // transporter either - see email.service.js) blocked the HTTP response
  // long enough for the frontend's own request timeout to fire first,
  // surfacing a misleading "server is waking up" message.
  emailService.sendPasswordResetEmail(user, token).catch((err) => {
    logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
  });

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
