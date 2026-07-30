const { registerSchema, loginSchema } = require('../src/validators/authValidators');
const { createContractSchema, escrowFundSchema } = require('../src/validators/contractValidators');
const { createCategorySchema } = require('../src/validators/categoryValidators');

describe('authValidators', () => {
  it('accepts a well-formed registration payload', () => {
    const result = registerSchema.safeParse({
      body: { name: 'Ramesh Meena', email: 'ramesh@example.com', password: 'password123', role: 'farmer' },
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ['missing email', { name: 'A', password: 'password123', role: 'farmer' }],
    ['short password', { name: 'A', email: 'a@b.com', password: 'short', role: 'farmer' }],
    ['invalid role', { name: 'A', email: 'a@b.com', password: 'password123', role: 'admin' }],
  ])('rejects %s', (_label, body) => {
    const result = registerSchema.safeParse({ body });
    expect(result.success).toBe(false);
  });

  it('rejects an empty login password', () => {
    const result = loginSchema.safeParse({ body: { email: 'a@b.com', password: '' } });
    expect(result.success).toBe(false);
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
