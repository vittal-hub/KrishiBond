import api from './axios';

export const marketplaceApi = {
  search: (params) => api.get('/marketplace/search', { params }).then((r) => r.data),
  getListing: (id) => api.get(`/marketplace/listings/${id}`).then((r) => r.data),
  createListing: (payload) => api.post('/marketplace/listings', payload).then((r) => r.data),
  updateListing: (id, payload) => api.put(`/marketplace/listings/${id}`, payload).then((r) => r.data),
  deleteListing: (id) => api.delete(`/marketplace/listings/${id}`).then((r) => r.data),
  myListings: () => api.get('/marketplace/listings/mine').then((r) => r.data),
  matches: () => api.get('/marketplace/matches').then((r) => r.data),
  priceBenchmarks: (crop) => api.get('/marketplace/benchmarks', { params: { crop } }).then((r) => r.data),
};
