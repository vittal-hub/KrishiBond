import api from './axios';

export const messageApi = {
  threads: () => api.get('/messages/threads').then((r) => r.data),
  thread: (threadId) => api.get(`/messages/threads/${threadId}`).then((r) => r.data),
  send: (threadId, payload) => api.post(`/messages/threads/${threadId}`, payload).then((r) => r.data),
  startThread: (payload) => api.post('/messages/threads', payload).then((r) => r.data),
};

export const notificationApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
};

export const disputeApi = {
  list: () => api.get('/disputes').then((r) => r.data),
  getById: (id) => api.get(`/disputes/${id}`).then((r) => r.data),
  file: (payload) => api.post('/disputes', payload).then((r) => r.data),
  addEvidence: (id, payload) => api.post(`/disputes/${id}/evidence`, payload).then((r) => r.data),
  addComment: (id, payload) => api.post(`/disputes/${id}/comments`, payload).then((r) => r.data),
};

export const supportApi = {
  faqs: () => api.get('/support/faqs').then((r) => r.data),
  submitTicket: (payload) => api.post('/support/tickets', payload).then((r) => r.data),
};
