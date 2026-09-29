import api from './axios';

export const walletApi = {
  getMine: () => api.get('/wallet/me').then((r) => r.data),
  initiateTopup: (amount) => api.post('/wallet/topup/initiate', { amount }).then((r) => r.data),
  completeTopupDemo: (transactionId, payload) =>
    api.post(`/wallet/topup/${transactionId}/demo/complete`, payload).then((r) => r.data),
  verifyTopup: (transactionId, payload) =>
    api.post(`/wallet/topup/${transactionId}/verify`, payload).then((r) => r.data),
};
