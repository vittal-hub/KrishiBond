const request = require('supertest');

// Registers a fresh user, completes OTP verification (using the dev-only
// `devOtp` the API returns outside production - see auth.service.js), and
// returns both the resulting user record and an Authorization header ready
// to spread into a supertest `.set(...)` call. Registration alone no longer
// starts a session, so every existing test that needs an authenticated user
// goes through this same two-step flow.
async function registerUser(app, overrides = {}) {
  const payload = {
    name: 'Test User',
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    role: 'farmer',
    phone: '9876543210',
    ...overrides,
  };
  const registerRes = await request(app).post('/api/auth/register').send(payload);
  const verifyRes = await request(app)
    .post('/api/auth/verify-email-otp')
    .send({ email: payload.email, otp: registerRes.body.devOtp });
  return { user: verifyRes.body.user, accessToken: verifyRes.body.accessToken };
}

function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

module.exports = { registerUser, authHeader };
