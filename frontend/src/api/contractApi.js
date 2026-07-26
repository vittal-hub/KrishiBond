import api from './axios';

export const contractApi = {
  list: (params) => api.get('/contracts', { params }).then((r) => r.data),
  getById: (id) => api.get(`/contracts/${id}`).then((r) => r.data),
  create: (payload) => api.post('/contracts', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/contracts/${id}`, payload).then((r) => r.data),
  accept: (id) => api.post(`/contracts/${id}/accept`).then((r) => r.data),
  reject: (id, reason) => api.post(`/contracts/${id}/reject`, { reason }).then((r) => r.data),
  cancel: (id, reason) => api.post(`/contracts/${id}/cancel`, { reason }).then((r) => r.data),
  markMilestone: (id, milestoneId) =>
    api.post(`/contracts/${id}/milestones/${milestoneId}/complete`).then((r) => r.data),
  timeline: (id) => api.get(`/contracts/${id}/timeline`).then((r) => r.data),

  // Price negotiation / bidding
  placeBid: (id, payload) => api.post(`/contracts/${id}/bids`, payload).then((r) => r.data),
  listBids: (id) => api.get(`/contracts/${id}/bids`).then((r) => r.data),
  acceptBid: (id, bidId) => api.post(`/contracts/${id}/bids/${bidId}/accept`).then((r) => r.data),

  // Payments / escrow
  initiatePayment: (id, payload) => api.post(`/contracts/${id}/payments`, payload).then((r) => r.data),
  paymentHistory: (id) => api.get(`/contracts/${id}/payments`).then((r) => r.data),
  releaseEscrow: (id) => api.post(`/contracts/${id}/escrow/release`).then((r) => r.data),

  // Reporting
  summaryReport: (params) => api.get('/contracts/reports/summary', { params }).then((r) => r.data),
  exportReport: (params) =>
    api.get('/contracts/reports/export', { params, responseType: 'blob' }).then((r) => r.data),
};
