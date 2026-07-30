import api from './axios';

export const transactionApi = {
  list: (params) => api.get('/transactions', { params }).then((r) => r.data),
  getById: (id) => api.get(`/transactions/${id}`).then((r) => r.data),
  getAnalytics: (months) => api.get('/transactions/analytics', { params: { months } }).then((r) => r.data),
};
