const rateLimit = require('express-rate-limit');

// The test suite runs every request through supertest with no real distinct
// client IP, so every test in a file shares the same rate-limit bucket -
// registering a handful of users (each now also hitting authLimiter a second
// time for OTP verification/resend) can legitimately exceed a per-IP ceiling
// that is perfectly reasonable for a real user. Skipping the limiter itself
// (not raising it) in test env keeps production behavior completely
// unchanged while not making the test suite's pass/fail depend on how many
// auth-related calls happen to run before it in the same file.
const skipInTest = () => process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// For user-generated-content endpoints prone to spam (messages, reviews,
// disputes, support tickets) - tighter than the general API ceiling but
// generous enough for legitimate use.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

module.exports = { authLimiter, apiLimiter, writeLimiter };
