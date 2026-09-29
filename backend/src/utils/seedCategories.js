require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');
const { DEFAULT_CATEGORIES } = require('../data/defaultCategories');

(async () => {
  await connectDB();
  await Category.deleteMany({});
  await Category.insertMany(DEFAULT_CATEGORIES);
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories`);
  await mongoose.disconnect();
  process.exit(0);
})();
