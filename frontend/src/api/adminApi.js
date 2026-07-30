import api from './axios';

export const adminApi = {
  stats: () => api.get('/admin/stats').then((r) => r.data),

  listUsers: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  suspendUser: (id, reason) => api.patch(`/admin/users/${id}/suspend`, { reason }).then((r) => r.data),
  reactivateUser: (id) => api.patch(`/admin/users/${id}/reactivate`).then((r) => r.data),

  listTickets: (params) => api.get('/admin/tickets', { params }).then((r) => r.data),
  updateTicket: (id, status) => api.patch(`/admin/tickets/${id}`, { status }).then((r) => r.data),

  listAuditLogs: (params) => api.get('/admin/audit-logs', { params }).then((r) => r.data),

  listKyc: (params) => api.get('/kyc', { params }).then((r) => r.data),
  approveKyc: (id) => api.patch(`/kyc/${id}/approve`).then((r) => r.data),
  rejectKyc: (id, rejectionReason) => api.patch(`/kyc/${id}/reject`, { rejectionReason }).then((r) => r.data),

  createCategory: (payload) => api.post('/categories', payload).then((r) => r.data),
  updateCategory: (id, payload) => api.patch(`/categories/${id}`, payload).then((r) => r.data),
  deleteCategory: (id) => api.delete(`/categories/${id}`).then((r) => r.data),

  createFaq: (payload) => api.post('/help/faqs', payload).then((r) => r.data),
  updateFaq: (id, payload) => api.patch(`/help/faqs/${id}`, payload).then((r) => r.data),
  deleteFaq: (id) => api.delete(`/help/faqs/${id}`).then((r) => r.data),

  listPayments: (params) => api.get('/admin/payments', { params }).then((r) => r.data),
  updatePaymentStatus: (id, status) => api.patch(`/admin/payments/${id}/status`, { status }).then((r) => r.data),
};
