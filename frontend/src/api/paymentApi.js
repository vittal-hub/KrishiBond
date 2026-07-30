import api from './axios';

export const paymentApi = {
  history: (params) => api.get('/payments/history', { params }).then((r) => r.data),
};
