import api from './axios';

export const categoryApi = {
  list: () => api.get('/categories').then((r) => r.data),
};
