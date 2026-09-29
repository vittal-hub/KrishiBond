import api from './axios';

export const userApi = {
  getById: (id) => api.get(`/users/${id}`).then((r) => r.data),
  uploadSignature: (file) => {
    const formData = new FormData();
    formData.append('signature', file);
    return api
      .post('/users/me/signature', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
};
