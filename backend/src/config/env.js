require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  nodeEnv,
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kissanbazaar',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  cookie: {
    // httpOnly refresh-token cookie: readable only by the server, sent
    // automatically by the browser on same-site requests to the API.
    refreshTokenName: 'kb_refresh_token',
    secure: nodeEnv === 'production',
    sameSite: nodeEnv === 'production' ? 'strict' : 'lax',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'no-reply@krishibond.app',
    fromName: process.env.SMTP_FROM_NAME || 'KrishiBond',
  },
  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_IN_MINUTES, 10) || 10,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
};

// Fail fast in production if secrets were left at their insecure defaults.
if (nodeEnv === 'production') {
  const insecureDefaults = [];
  if (config.jwt.accessSecret === 'dev_access_secret') insecureDefaults.push('JWT_ACCESS_SECRET');
  if (config.jwt.refreshSecret === 'dev_refresh_secret') insecureDefaults.push('JWT_REFRESH_SECRET');
  if (!process.env.MONGO_URI) insecureDefaults.push('MONGO_URI');
  if (insecureDefaults.length) {
    // eslint-disable-next-line no-console
    console.error(`Refusing to start in production with missing/default env vars: ${insecureDefaults.join(', ')}`);
    process.exit(1);
  }
}

module.exports = config;
