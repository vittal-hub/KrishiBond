import api from './axios';

export const walletApi = {
  getMine: () => api.get('/wallet/me').then((r) => r.data),
};
