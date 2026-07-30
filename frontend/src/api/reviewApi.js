import api from './axios';

export const reviewApi = {
  submit: (payload) => api.post('/reviews', payload).then((r) => r.data),
  listForUser: (userId, params) => api.get(`/reviews/user/${userId}`, { params }).then((r) => r.data),
  forContract: (contractId) => api.get(`/reviews/contract/${contractId}`).then((r) => r.data),
  respond: (id, text) => api.post(`/reviews/${id}/response`, { text }).then((r) => r.data),
};
