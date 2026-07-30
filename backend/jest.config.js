module.exports = {
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  forceExit: true,
};
