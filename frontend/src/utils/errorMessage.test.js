import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './errorMessage';

describe('getErrorMessage', () => {
  it('prefers the API response message', () => {
    const error = { response: { data: { message: 'Email already registered' } } };
    expect(getErrorMessage(error)).toBe('Email already registered');
  });

  it('falls back to the response error field', () => {
    const error = { response: { data: { error: 'Not found' } } };
    expect(getErrorMessage(error)).toBe('Not found');
  });

  it('falls back to the native error message', () => {
    const error = new Error('Network Error');
    expect(getErrorMessage(error)).toBe('Network Error');
  });

  it('falls back to the provided default when nothing else is available', () => {
    expect(getErrorMessage({}, 'Could not save changes')).toBe('Could not save changes');
  });

  it('uses the generic default when no fallback is given', () => {
    expect(getErrorMessage({})).toBe('Something went wrong. Please try again.');
  });
});
