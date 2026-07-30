import api from './axios';

export const kycApi = {
  getMine: () => api.get('/kyc/me').then((r) => r.data),
  submit: (payload) => api.post('/kyc', payload).then((r) => r.data),
};
