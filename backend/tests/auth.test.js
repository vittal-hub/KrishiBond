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

// Registers + completes OTP verification, returning a ready-to-use access
// token - the equivalent of the old "register returns an accessToken"
// helper, now that registration itself only creates an unverified account.
async function registerAndVerify(overrides = {}) {
  const payload = { ...VALID_USER, ...overrides };
  const registerRes = await request(app).post('/api/auth/register').send(payload);
  const verifyRes = await request(app)
    .post('/api/auth/verify-email-otp')
    .send({ email: payload.email, otp: registerRes.body.devOtp });
  return { registerRes, verifyRes };
}

describe('POST /api/auth/register', () => {
  it('creates an unverified account and emails an OTP, without starting a session', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.email).toBe(VALID_USER.email);
    expect(res.body).not.toHaveProperty('accessToken');

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

describe('POST /api/auth/verify-email-otp', () => {
  it('verifies the correct OTP and issues a session', async () => {
    const { verifyRes } = await registerAndVerify();

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.accessToken).toEqual(expect.any(String));
    expect(verifyRes.body.user.emailVerified).toBe(true);
  });

  it('rejects an incorrect OTP', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const res = await request(app)
      .post('/api/auth/verify-email-otp')
      .send({ email: VALID_USER.email, otp: '000000' });

    expect(res.status).toBe(400);
  });

  it('locks out after too many incorrect attempts', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/verify-email-otp').send({ email: VALID_USER.email, otp: '000000' });
    }
    const res = await request(app).post('/api/auth/verify-email-otp').send({ email: VALID_USER.email, otp: '000000' });
    expect(res.status).toBe(429);
  });

  it('rejects verifying an already-verified email', async () => {
    const { registerRes } = await registerAndVerify();
    const res = await request(app)
      .post('/api/auth/verify-email-otp')
      .send({ email: VALID_USER.email, otp: registerRes.body.devOtp });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/resend-email-otp', () => {
  it('invalidates the previous OTP and issues a new one', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(VALID_USER);
    const oldOtp = registerRes.body.devOtp;

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
