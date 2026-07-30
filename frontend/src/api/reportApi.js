import api from './axios';

export const reportApi = {
  summary: (params) => api.get('/reports/summary', { params }).then((r) => r.data),
  income: (params) => api.get('/reports/income', { params }).then((r) => r.data),
  crops: (params) => api.get('/reports/crops', { params }).then((r) => r.data),
  export: (params) => api.get('/reports/export', { params, responseType: 'blob' }).then((r) => r.data),
};
