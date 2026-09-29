import api from './axios';

export const messageApi = {
  threads: () => api.get('/messages/threads').then((r) => r.data),
  thread: (threadId, params) => api.get(`/messages/threads/${threadId}`, { params }).then((r) => r.data),
  // clientId lets the backend recognize a resend of the exact same compose
  // action (e.g. a manual retry after a slow/timed-out request) and return
  // the message that was already created instead of inserting a duplicate.
  send: (threadId, payload, clientId) =>
    api.post(`/messages/threads/${threadId}`, { ...payload, clientId }).then((r) => r.data),
  startThread: (payload) => api.post('/messages/threads', payload).then((r) => r.data),
  uploadAttachment: (threadId, file, clientId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (clientId) formData.append('clientId', clientId);
    return api
      .post(`/messages/threads/${threadId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};

export const notificationApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
  getPreferences: () => api.get('/notifications/preferences').then((r) => r.data),
  updatePreferences: (payload) => api.patch('/notifications/preferences', payload).then((r) => r.data),
};

export const disputeApi = {
  list: () => api.get('/disputes').then((r) => r.data),
  getById: (id) => api.get(`/disputes/${id}`).then((r) => r.data),
  file: (payload) => api.post('/disputes', payload).then((r) => r.data),
  addComment: (id, text) => api.post(`/disputes/${id}/comments`, { text }).then((r) => r.data),
  uploadEvidence: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post(`/disputes/${id}/evidence`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
  resolve: (id, payload) => api.patch(`/disputes/${id}/resolve`, payload).then((r) => r.data),
};

export const supportApi = {
  faqs: () => api.get('/help/faqs').then((r) => r.data),
  submitTicket: (payload) => api.post('/help/tickets', payload).then((r) => r.data),
  myTickets: () => api.get('/help/tickets').then((r) => r.data),
};
