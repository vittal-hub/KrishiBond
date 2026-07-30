const request = require('supertest');

// Registers a fresh user and returns both the raw user record and an
// Authorization header ready to spread into a supertest `.set(...)` call.
async function registerUser(app, overrides = {}) {
  const payload = {
    name: 'Test User',
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    role: 'farmer',
    phone: '9876543210',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  return { user: res.body.user, accessToken: res.body.accessToken };
}

function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

module.exports = { registerUser, authHeader };
