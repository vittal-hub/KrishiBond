import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatRelative } from './format';

describe('formatCurrency', () => {
  it('formats a number as INR currency', () => {
    expect(formatCurrency(42500)).toBe('₹42,500');
  });

  it('defaults a missing value to 0', () => {
    expect(formatCurrency(undefined)).toBe('₹0');
  });
});

describe('formatDate', () => {
  it('formats a date string in dd MMM yyyy form', () => {
    expect(formatDate('2026-01-15')).toBe('15 Jan 2026');
  });

  it('returns an em dash for a missing date', () => {
    expect(formatDate(null)).toBe('—');
  });
});

describe('formatRelative', () => {
  it('returns an em dash for a missing date', () => {
    expect(formatRelative(undefined)).toBe('—');
  });

  it('returns a human-readable string for a real date', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(formatRelative(oneHourAgo)).toMatch(/ago/);
  });
});
