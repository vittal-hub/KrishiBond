const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/token');
const { jwt: jwtConfig, cookie: cookieConfig } = require('../config/env');

function msFromExpiry(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return value * unit;
}

const REFRESH_TOKEN_MAX_AGE_MS = msFromExpiry(jwtConfig.refreshExpiresIn);
const MAX_ACTIVE_SESSIONS = 5;

/**
 * Issues a new access/refresh token pair and appends the refresh token's id
 * to the user's session list. Caller is responsible for `user.save()`.
 */
function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, tokenId } = signRefreshToken(user);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push({ tokenId, expiresAt });
  // Cap concurrent sessions so the array (and cookie churn) can't grow unbounded.
  user.refreshTokens = user.refreshTokens.slice(-MAX_ACTIVE_SESSIONS);

  return { accessToken, refreshToken };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(cookieConfig.refreshTokenName, refreshToken, {
    httpOnly: true,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/api',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(cookieConfig.refreshTokenName, {
    httpOnly: true,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    path: '/api',
  });
}

module.exports = {
  issueTokenPair,
  setRefreshCookie,
  clearRefreshCookie,
  verifyRefreshToken,
  REFRESH_TOKEN_MAX_AGE_MS,
};
