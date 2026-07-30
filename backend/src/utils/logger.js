const winston = require('winston');
const { nodeEnv } = require('../config/env');

const logger = winston.createLogger({
  level: nodeEnv === 'production' ? 'info' : 'debug',
  silent: nodeEnv === 'test',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
