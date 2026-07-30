import api from './axios';

export const authApi = {
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  logoutAll: () => api.post('/auth/logout-all').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }).then((r) => r.data),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`).then((r) => r.data),
  resendVerification: () => api.post('/auth/resend-verification').then((r) => r.data),
  sendOtp: () => api.post('/auth/send-otp').then((r) => r.data),
  verifyOtp: (otp) => api.post('/auth/verify-otp', { otp }).then((r) => r.data),
};
