const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { mongoUri } = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(mongoUri);
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
