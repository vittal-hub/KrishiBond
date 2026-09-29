const Category = require('../models/Category');
const { DEFAULT_CATEGORIES } = require('../data/defaultCategories');
const logger = require('./logger');

// Runs once at server startup. Categories only ever needed a one-off manual
// seed script (utils/seedCategories.js) to exist - on a fresh deployment
// (new database, e.g. a new Render/Atlas environment) nobody remembers to
// run that, which is exactly why the category dropdown could end up with no
// options at all. This makes the collection self-healing: it only inserts
// the defaults if the collection is genuinely empty, and never touches it
// otherwise, so categories an admin has since edited/added are untouched.
async function ensureDefaultCategories() {
  const count = await Category.countDocuments();
  if (count > 0) return;
  await Category.insertMany(DEFAULT_CATEGORIES);
  logger.info(`No categories found - seeded ${DEFAULT_CATEGORIES.length} default categories`);
}

module.exports = ensureDefaultCategories;
