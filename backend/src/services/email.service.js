const nodemailer = require('nodemailer');
const { smtp, clientUrl, nodeEnv } = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;
if (smtp.host && smtp.user && smtp.pass) {
  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    // Without these, a slow/unreachable SMTP provider (or an outbound port
    // silently blocked by the hosting environment) can leave the socket open
    // far longer than any caller would reasonably wait - these bound every
    // send to a worst case of ~20s instead of hanging indefinitely.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

// In dev/when SMTP isn't configured yet, emails are logged instead of sent so
// the full auth flow (verification, reset, OTP) stays testable end-to-end.
async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    logger.info(`[email:dev-mode] To: ${to} | Subject: ${subject}\n${text || html}`);
    return { delivered: false, devMode: true };
  }
  try {
    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to,
      subject,
      html,
      text,
    });
    return { delivered: true };
  } catch (err) {
    logger.error(`Failed to send email to ${to}: ${err.message}`);
    return { delivered: false, error: err.message };
  }
}

function sendPasswordResetEmail(user, token) {
  const link = `${clientUrl}/reset-password/${token}`;
  return sendMail({
    to: user.email,
    subject: 'Reset your KrishiBond password',
    text: `Hi ${user.name}, reset your password: ${link} (expires in 1 hour)`,
    html: `<p>Hi ${user.name},</p><p>We received a request to reset your password.</p><p><a href="${link}">Reset password</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
  });
}

function sendOtpEmail(user, otp) {
  return sendMail({
    to: user.email,
    subject: 'Your KrishiBond verification code',
    text: `Your OTP is ${otp}. It expires in ${nodeEnv === 'production' ? 10 : 10} minutes.`,
    html: `<p>Your KrishiBond verification code is:</p><p style="font-size:24px;font-weight:bold;">${otp}</p>`,
  });
}

const CATEGORY_SUBJECT_PREFIX = {
  contract: 'Contract update',
  payment: 'Payment update',
  offer: 'New offer activity',
  kyc: 'KYC status update',
  dispute: 'Dispute update',
  message: 'New message',
  system: 'KrishiBond notification',
};

function sendNotificationEmail(user, { category, message, link }) {
  const prefix = CATEGORY_SUBJECT_PREFIX[category] || CATEGORY_SUBJECT_PREFIX.system;
  const url = link ? `${clientUrl}${link}` : clientUrl;
  return sendMail({
    to: user.email,
    subject: `${prefix} - KrishiBond`,
    text: `Hi ${user.name}, ${message}\n\nView details: ${url}`,
    html: `<p>Hi ${user.name},</p><p>${message}</p><p><a href="${url}">View details</a></p><p style="font-size:12px;color:#7C8577;">You can manage which of these emails you receive from your KrishiBond profile settings.</p>`,
  });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  sendOtpEmail,
  sendNotificationEmail,
  isConfigured: !!transporter,
};
