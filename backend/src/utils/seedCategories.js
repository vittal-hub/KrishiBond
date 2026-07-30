require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');

const categories = [
  { name: 'Cereals & Grains', description: 'Wheat, rice, maize, millets' },
  { name: 'Pulses', description: 'Lentils, chickpeas, gram' },
  { name: 'Vegetables', description: 'Fresh vegetables' },
  { name: 'Fruits', description: 'Fresh fruits' },
  { name: 'Cash Crops', description: 'Cotton, sugarcane, jute' },
  { name: 'Oilseeds', description: 'Groundnut, mustard, soybean' },
  { name: 'Spices', description: 'Turmeric, chilli, coriander' },
];

(async () => {
  await connectDB();
  await Category.deleteMany({});
  await Category.insertMany(categories);
  console.log(`Seeded ${categories.length} categories`);
  await mongoose.disconnect();
  process.exit(0);
})();
