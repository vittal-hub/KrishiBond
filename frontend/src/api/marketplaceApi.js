import api from './axios';

export const marketplaceApi = {
  search: (params) => api.get('/marketplace/listings', { params }).then((r) => r.data),
  getListing: (id) => api.get(`/marketplace/listings/${id}`).then((r) => r.data),
  createListing: (payload) => api.post('/marketplace/listings', payload).then((r) => r.data),
  updateListing: (id, payload) => api.put(`/marketplace/listings/${id}`, payload).then((r) => r.data),
  deleteListing: (id) => api.delete(`/marketplace/listings/${id}`).then((r) => r.data),
  myListings: () => api.get('/marketplace/listings/mine').then((r) => r.data),
  favourites: () => api.get('/marketplace/favourites').then((r) => r.data),
  toggleFavourite: (id) => api.post(`/marketplace/listings/${id}/favourite`).then((r) => r.data),
  uploadImages: (id, files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return api
      .post(`/marketplace/listings/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  matches: () => api.get('/marketplace/matches').then((r) => r.data),
  priceBenchmarks: (cropType) => api.get('/marketplace/price-benchmark', { params: { cropType } }).then((r) => r.data),
  categories: () => api.get('/categories').then((r) => r.data),
};
