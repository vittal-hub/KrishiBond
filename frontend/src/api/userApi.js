import api from './axios';

export const userApi = {
  getById: (id) => api.get(`/users/${id}`).then((r) => r.data),
};
