const request = require('supertest');
const testDb = require('./testDb');
const app = require('../src/app');
const User = require('../src/models/User');

beforeAll(async () => {
  await testDb.connect();
});

afterEach(async () => {
  await testDb.clearCollections();
});

afterAll(async () => {
  await testDb.disconnect();
});

const VALID_USER = {
  name: 'Ramesh Meena',
  email: 'ramesh@example.com',
  password: 'password123',
  role: 'farmer',
  phone: '9876543210',
};

// Registers a user and returns the response, which now includes a ready-to-
// use access token - registration no longer gates on email/phone OTP
// verification, it starts a session immediately (like login).
async function registerAndVerify(overrides = {}) {
  const payload = { ...VALID_USER, ...overrides };
  const registerRes = await request(app).post('/api/auth/register').send(payload);
  return { registerRes, verifyRes: registerRes };
}

describe('POST /api/auth/register', () => {
  it('creates the account and starts a session immediately, with no OTP step', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(VALID_USER.email);

    const stored = await User.findOne({ email: VALID_USER.email });
    expect(stored.emailVerified).toBe(false);
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects a duplicate email regardless of casing', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: VALID_USER.email.toUpperCase() });

    expect(res.status).toBe(409);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, password: 'short' });

    expect(res.status).toBe(400);
  });

  it('rejects an invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, role: 'admin' });

    expect(res.status).toBe(400);
  });

  it('rejects an invalid phone number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, phone: '123456789012' });

    expect(res.status).toBe(400);
  });
});

// Email OTP verification is no longer part of registration - it's now an
// optional, post-registration action (surfaced in Profile) that a user can
// take any time to mark their email as verified. resendEmailOtp is the entry
// point that issues the first OTP, since register() no longer generates one.
describe('POST /api/auth/verify-email-otp (optional, post-registration)', () => {
  it('verifies the correct OTP', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const resendRes = await request(app).post('/api/auth/resend-email-otp').send({ email: VALID_USER.email });

    const res = await request(app)
      .post('/api/auth/verify-email-otp')
      .send({ email: VALID_USER.email, otp: resendRes.body.devOtp });

    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true);
  });

  it('rejects an incorrect OTP', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    await request(app).post('/api/auth/resend-email-otp').send({ email: VALID_USER.email });
    const res = await request(app)
      .post('/api/auth/verify-email-otp')
      .send({ email: VALID_USER.email, otp: '000000' });

    expect(res.status).toBe(400);
  });

  it('locks out after too many incorrect attempts', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    await request(app).post('/api/auth/resend-email-otp').send({ email: VALID_USER.email });
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/verify-email-otp').send({ email: VALID_USER.email, otp: '000000' });
    }
    const res = await request(app).post('/api/auth/verify-email-otp').send({ email: VALID_USER.email, otp: '000000' });
    expect(res.status).toBe(429);
  });

  it('rejects verifying an already-verified email', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const resendRes = await request(app).post('/api/auth/resend-email-otp').send({ email: VALID_USER.email });
    await request(app)
      .post('/api/auth/verify-email-otp')
      .send({ email: VALID_USER.email, otp: resendRes.body.devOtp });

    const res = await request(app)
      .post('/api/auth/verify-email-otp')
      .send({ email: VALID_USER.email, otp: resendRes.body.devOtp });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/resend-email-otp', () => {
  it('invalidates the previous OTP and issues a new one', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const firstRes = await request(app).post('/api/auth/resend-email-otp').send({ email: VALID_USER.email });
    const oldOtp = firstRes.body.devOtp;

    const resendRes = await request(app).post('/api/auth/resend-email-otp').send({ email: VALID_USER.email });
    const newOtp = resendRes.body.devOtp;

    expect(newOtp).toEqual(expect.any(String));
    expect(newOtp).not.toBe(oldOtp);

    const staleAttempt = await request(app)
      .post('/api/auth/verify-email-otp')
      .send({ email: VALID_USER.email, otp: oldOtp });
    expect(staleAttempt.status).toBe(400);

    const freshAttempt = await request(app)
      .post('/api/auth/verify-email-otp')
      .send({ email: VALID_USER.email, otp: newOtp });
    expect(freshAttempt.status).toBe(200);
  });

  it('gives the same generic response for an unknown email (no enumeration)', async () => {
    const res = await request(app).post('/api/auth/resend-email-otp').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.devOtp).toBeUndefined();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerAndVerify();
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('logs in with a different email casing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email.toUpperCase(), password: VALID_USER.password });

    expect(res.status).toBe(200);
  });

  it('rejects an incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects a suspended account', async () => {
    await User.updateOne({ email: VALID_USER.email }, { status: 'suspended' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(403);
  });
});

describe('protected routes', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('accepts requests with a valid access token', async () => {
    const { verifyRes } = await registerAndVerify();

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${verifyRes.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(VALID_USER.email);
  });

  it('rejects a token for a since-suspended account', async () => {
    const { verifyRes } = await registerAndVerify();
    await User.updateOne({ email: VALID_USER.email }, { status: 'suspended' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${verifyRes.body.accessToken}`);

    expect(res.status).toBe(403);
  });
});
