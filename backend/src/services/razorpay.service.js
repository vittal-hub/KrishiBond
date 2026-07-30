const crypto = require('crypto');
const { razorpay: config } = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const isConfigured = Boolean(config.keyId && config.keySecret);

async function createOrder({ amount, receipt, notes }) {
  if (!isConfigured) throw new ApiError(503, 'Payment gateway is not configured yet');

  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    // Razorpay expects the amount in paise; our ledger stores rupees.
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt, notes }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error(`Razorpay order creation failed: ${body}`);
    throw new ApiError(502, 'Could not create payment order with the gateway');
  }
  return response.json();
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', config.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

function verifyWebhookSignature(rawBody, signature) {
  if (!config.webhookSecret) return false;
  const expected = crypto.createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex');
  return expected === signature;
}

module.exports = { isConfigured, createOrder, verifyPaymentSignature, verifyWebhookSignature };
