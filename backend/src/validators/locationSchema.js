const { z } = require('zod');
const { INDIA_STATES, DISTRICTS_BY_STATE } = require('../data/indiaLocations');

// Same dataset the frontend's State/District dropdowns are built from
// (src/data/indiaLocations.js on each side) - the backend never trusts the
// dropdown value alone, so a request is re-checked against this list rather
// than just accepting any string. Both fields stay optional (partial
// profile/listing updates, and pre-existing free-text records, shouldn't be
// forced to resubmit a location just to change something unrelated); the
// state/district pair is only cross-checked against each other when both
// are present in the same request.
const locationSchema = z
  .object({
    state: z.string().min(1).optional(),
    district: z.string().min(1).optional(),
  })
  .optional()
  .refine((loc) => !loc?.state || INDIA_STATES.includes(loc.state), {
    message: 'Unrecognized state',
    path: ['state'],
  })
  .refine((loc) => !loc?.state || !loc?.district || (DISTRICTS_BY_STATE[loc.state] || []).includes(loc.district), {
    message: 'District does not belong to the selected state',
    path: ['district'],
  });

module.exports = { locationSchema };
