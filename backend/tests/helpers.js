const request = require('supertest');
const Listing = require('../src/models/Listing');

// Registers a fresh user and returns both the resulting user record and an
// Authorization header ready to spread into a supertest `.set(...)` call.
// Registration starts a session immediately (no email/phone OTP gate), so
// this is a single call.
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
  return { user: registerRes.body.user, accessToken: registerRes.body.accessToken };
}

function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

// A buyer can only create a contract against a real, open listing (the
// farmer is derived from listing.owner server-side - see
// contractController.createContract). Tests that just need *some* contract
// to exist create the listing directly via the model rather than the full
// marketplace API, since the listing's own creation flow isn't what's under
// test in most callers of this helper.
async function createListing(farmerUserId, overrides = {}) {
  return Listing.create({
    owner: farmerUserId,
    cropType: 'Basmati Rice',
    quantity: 100,
    unit: 'quintal',
    pricePerUnit: 3000,
    status: 'open',
    ...overrides,
  });
}

module.exports = { registerUser, authHeader, createListing };
