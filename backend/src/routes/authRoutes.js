const express = require('express');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailOtpSchema,
  resendEmailOtpSchema,
  verifyOtpSchema,
} = require('../validators/authValidators');
const ctrl = require('../controllers/authController');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', protect, ctrl.logout);
router.post('/logout-all', protect, ctrl.logoutAll);
router.get('/me', protect, ctrl.me);

// Public: a user who just registered has no session yet to authenticate
// these with. verifyEmailOtp is also reused by an already-logged-in user
// re-verifying from their profile.
router.post('/verify-email-otp', authLimiter, validate(verifyEmailOtpSchema), ctrl.verifyEmailOtp);
router.post('/resend-email-otp', authLimiter, validate(resendEmailOtpSchema), ctrl.resendEmailOtp);

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password/:token', authLimiter, validate(resetPasswordSchema), ctrl.resetPassword);

router.post('/send-otp', protect, authLimiter, ctrl.sendOtp);
router.post('/verify-otp', protect, authLimiter, validate(verifyOtpSchema), ctrl.verifyOtp);

module.exports = router;
