// Single source of truth for the default produce categories - used by both
// the manual reseed script (utils/seedCategories.js) and the idempotent
// startup bootstrap (ensureDefaultCategories, called from server.js) so
// there's exactly one place these are defined instead of two lists that
// could silently drift apart.
const DEFAULT_CATEGORIES = [
  { name: 'Cereals & Grains', description: 'Wheat, rice, maize, millets' },
  { name: 'Pulses', description: 'Lentils, chickpeas, gram' },
  { name: 'Vegetables', description: 'Fresh vegetables' },
  { name: 'Fruits', description: 'Fresh fruits' },
  { name: 'Cash Crops', description: 'Cotton, sugarcane, jute' },
  { name: 'Oilseeds', description: 'Groundnut, mustard, soybean' },
  { name: 'Spices', description: 'Turmeric, chilli, coriander' },
];

module.exports = { DEFAULT_CATEGORIES };
