const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { clientUrl, nodeEnv } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

app.use(helmet());
// credentials: true is required so the browser will send/receive the
// httpOnly refresh-token cookie set by /auth endpoints.
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(compression());
app.use(
  express.json({
    limit: '1mb',
    // Retained for Razorpay webhook signature verification, which must hash
    // the exact raw bytes the gateway sent, not a re-serialized JS object.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (nodeEnv !== 'test') {
  app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
