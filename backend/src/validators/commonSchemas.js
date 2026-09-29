const { z } = require('zod');

// Shared primitive schemas so the same validation rule isn't hand-copied
// (and allowed to drift) across authValidators/userValidators/etc.

// Case-insensitive email handling: User.email is stored lowercase (schema
// `lowercase: true`), but that transform only applies on save, not on a
// query filter - `User.findOne({ email: 'Test@Example.com' })` would not
// match a stored 'test@example.com'. Normalizing here, before the value
// ever reaches a controller/service, fixes duplicate-email checks, login,
// and password reset lookups all at once.
const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

// Indian mobile numbers: 10 digits, first digit 6-9. Anything else (too
// short/long, a landline-style number, letters) is rejected outright rather
// than only capping length - `maxLength` alone (the previous behavior) still
// let a 12-digit or all-letter value through as long as the frontend field
// happened to be under whatever cap was set.
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const phoneSchema = z
  .string()
  .trim()
  .regex(INDIAN_MOBILE_REGEX, 'Enter a valid 10-digit Indian mobile number');

// A person's name (farmer) or a business name (buyer, e.g. "Amber Foods Pvt.
// Ltd.") share this one field, so the rule can't require letters-only - that
// would reject legitimate company names containing numbers/periods/&. It
// only needs to reject the reported problem cases (all-digits, all-symbols)
// by requiring at least one letter somewhere in the string.
const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name is too long')
  .regex(/[A-Za-z]/, 'Name must contain at least one letter');

module.exports = { emailSchema, phoneSchema, nameSchema, INDIAN_MOBILE_REGEX };
