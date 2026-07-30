import api from './axios';

export const contractApi = {
  list: (params) => api.get('/contracts', { params }).then((r) => r.data),
  getById: (id) => api.get(`/contracts/${id}`).then((r) => r.data),
  create: (payload) => api.post('/contracts', payload).then((r) => r.data),
  accept: (id) => api.post(`/contracts/${id}/accept`).then((r) => r.data),
  complete: (id) => api.post(`/contracts/${id}/complete`).then((r) => r.data),
  reject: (id, reason) => api.post(`/contracts/${id}/reject`, { reason }).then((r) => r.data),
  cancel: (id, reason) => api.post(`/contracts/${id}/cancel`, { reason }).then((r) => r.data),
  sign: (id, signatureName) => api.post(`/contracts/${id}/sign`, { signatureName }).then((r) => r.data),
  addClause: (id, text) => api.post(`/contracts/${id}/clauses`, { text }).then((r) => r.data),
  markMilestone: (id, milestoneId) =>
    api.patch(`/contracts/${id}/milestones/${milestoneId}/complete`).then((r) => r.data),
  timeline: (id) => api.get(`/contracts/${id}/timeline`).then((r) => r.data),
  upcomingMilestones: () => api.get('/contracts/milestones/upcoming').then((r) => r.data),

  // Price negotiation / bidding
  placeBid: (id, payload) => api.post(`/contracts/${id}/bids`, payload).then((r) => r.data),
  listBids: (id) => api.get(`/contracts/${id}/bids`).then((r) => r.data),
  acceptBid: (id, bidId) => api.post(`/contracts/${id}/bids/${bidId}/accept`).then((r) => r.data),
  rejectBid: (id, bidId) => api.post(`/contracts/${id}/bids/${bidId}/reject`).then((r) => r.data),

  // Payments / escrow
  listPayments: (id) => api.get(`/contracts/${id}/payments`).then((r) => r.data),
  fundEscrow: (id, amount) => api.post(`/contracts/${id}/payments/fund`, { amount }).then((r) => r.data),
  verifyPayment: (id, paymentId, payload) =>
    api.post(`/contracts/${id}/payments/${paymentId}/verify`, payload).then((r) => r.data),
  releaseEscrow: (id, paymentId, amount) =>
    api.patch(`/contracts/${id}/payments/${paymentId}/release`, amount !== undefined ? { amount } : {}).then((r) => r.data),
  refundEscrow: (id, paymentId) =>
    api.post(`/contracts/${id}/payments/${paymentId}/refund`).then((r) => r.data),

  // Demo Payment Gateway (fully simulated — see DemoPaymentModal)
  initiateDemoPayment: (id, amount) => api.post(`/contracts/${id}/payments/demo/initiate`, { amount }).then((r) => r.data),
  completeDemoPayment: (id, paymentId, payload) =>
    api.post(`/contracts/${id}/payments/${paymentId}/demo/complete`, payload).then((r) => r.data),
};
