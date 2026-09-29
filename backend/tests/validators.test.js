const { registerSchema, loginSchema } = require('../src/validators/authValidators');
const { createContractSchema, escrowFundSchema } = require('../src/validators/contractValidators');
const { createCategorySchema } = require('../src/validators/categoryValidators');
const { locationSchema } = require('../src/validators/locationSchema');

const VALID_REGISTER_BODY = {
  name: 'Ramesh Meena',
  email: 'ramesh@example.com',
  password: 'password123',
  role: 'farmer',
  phone: '9876543210',
};

describe('authValidators', () => {
  it('accepts a well-formed registration payload', () => {
    const result = registerSchema.safeParse({ body: VALID_REGISTER_BODY });
    expect(result.success).toBe(true);
  });

  it('normalizes email to lowercase', () => {
    const result = registerSchema.safeParse({ body: { ...VALID_REGISTER_BODY, email: 'Ramesh@Example.COM' } });
    expect(result.success).toBe(true);
    expect(result.data.body.email).toBe('ramesh@example.com');
  });

  it.each([
    ['missing email', { name: 'A', password: 'password123', role: 'farmer', phone: '9876543210' }],
    ['short password', { ...VALID_REGISTER_BODY, password: 'short' }],
    ['invalid role', { ...VALID_REGISTER_BODY, role: 'admin' }],
    ['all-digit name', { ...VALID_REGISTER_BODY, name: '123456' }],
    ['all-symbol name', { ...VALID_REGISTER_BODY, name: '@@@@@@' }],
  ])('rejects %s', (_label, body) => {
    const result = registerSchema.safeParse({ body });
    expect(result.success).toBe(false);
  });

  it.each([
    ['too short', '123'],
    ['9 digits', '123456789'],
    ['12 digits', '123456789012'],
    ['all letters', 'abcdefghij'],
    ['starts with 5 (not a valid Indian mobile prefix)', '5123456789'],
    ['11 digits', '12345678901'],
  ])('rejects an invalid phone number: %s', (_label, phone) => {
    const result = registerSchema.safeParse({ body: { ...VALID_REGISTER_BODY, phone } });
    expect(result.success).toBe(false);
  });

  it.each(['9876543210', '6000000000', '7123456789', '8123456789'])(
    'accepts a valid 10-digit Indian mobile number: %s',
    (phone) => {
      const result = registerSchema.safeParse({ body: { ...VALID_REGISTER_BODY, phone } });
      expect(result.success).toBe(true);
    }
  );

  it('rejects an empty login password', () => {
    const result = loginSchema.safeParse({ body: { email: 'a@b.com', password: '' } });
    expect(result.success).toBe(false);
  });
});

describe('locationSchema', () => {
  it('accepts no location at all', () => {
    expect(locationSchema.safeParse(undefined).success).toBe(true);
  });

  it('accepts a real state/district combination', () => {
    expect(locationSchema.safeParse({ state: 'Tamil Nadu', district: 'Chennai' }).success).toBe(true);
  });

  it('rejects an unrecognized state', () => {
    expect(locationSchema.safeParse({ state: 'Narnia', district: 'Chennai' }).success).toBe(false);
  });

  it('rejects a district that belongs to a different state', () => {
    const result = locationSchema.safeParse({ state: 'Tamil Nadu', district: 'Mumbai' });
    expect(result.success).toBe(false);
  });

  it('accepts a state with no district yet (partial update)', () => {
    expect(locationSchema.safeParse({ state: 'Kerala' }).success).toBe(true);
  });
});

describe('contractValidators', () => {
  it('requires a positive quantity', () => {
    const result = createContractSchema.safeParse({
      body: { cropType: 'Wheat', quantity: -5 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a minimal valid contract payload', () => {
    const result = createContractSchema.safeParse({
      body: { cropType: 'Wheat', quantity: 10 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a zero or negative escrow amount', () => {
    expect(escrowFundSchema.safeParse({ body: { amount: 0 } }).success).toBe(false);
    expect(escrowFundSchema.safeParse({ body: { amount: -100 } }).success).toBe(false);
    expect(escrowFundSchema.safeParse({ body: { amount: 100 } }).success).toBe(true);
  });
});

describe('categoryValidators', () => {
  it('requires a category name of at least 2 characters', () => {
    expect(createCategorySchema.safeParse({ body: { name: 'A' } }).success).toBe(false);
    expect(createCategorySchema.safeParse({ body: { name: 'Grains' } }).success).toBe(true);
  });
});
