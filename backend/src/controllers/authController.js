const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { toUserDTO } = require('../utils/dto');
const authService = require('../services/auth.service');
const { setRefreshCookie, clearRefreshCookie } = require('../services/token.service');
const { cookie: cookieConfig } = require('../config/env');

const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ success: true, user: toUserDTO(user), accessToken });
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, user: toUserDTO(user), accessToken });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[cookieConfig.refreshTokenName];
  const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
  setRefreshCookie(res, newRefreshToken);
  res.json({ success: true, accessToken });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[cookieConfig.refreshTokenName];
  await authService.logout(req.user._id, refreshToken);
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user._id);
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out of all devices' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: toUserDTO(req.user) });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.params.token);
  res.json({ success: true, message: 'Email verified successfully', user: toUserDTO(user) });
});

const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.user._id);
  res.json({ success: true, message: 'Verification email sent' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { devResetToken } = await authService.forgotPassword(req.body.email);
  // Always respond success to avoid leaking which emails are registered.
  res.json({
    success: true,
    message: 'If that email exists, a reset link has been sent',
    devResetToken,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.params.token, req.body.password);
  res.json({ success: true, message: 'Password has been reset, please log in again' });
});

const sendOtp = asyncHandler(async (req, res) => {
  const { devOtp } = await authService.sendOtp(req.user._id);
  res.json({ success: true, message: 'OTP sent', devOtp });
});

const verifyOtp = asyncHandler(async (req, res) => {
  await authService.verifyOtp(req.user._id, req.body.otp);
  res.json({ success: true, message: 'Phone number verified' });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  sendOtp,
  verifyOtp,
};
