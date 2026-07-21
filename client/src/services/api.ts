import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('unistay_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('unistay_token');
      localStorage.removeItem('unistay_user');
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

// Listings
export const listingsAPI = {
  getAll: (params?: any) => api.get('/listings', { params }),
  getById: (id: number) => api.get(`/listings/${id}`),
  getMy: () => api.get('/listings/my'),
  create: (data: FormData) => api.post('/listings', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: any) => api.put(`/listings/${id}`, data),
  delete: (id: number) => api.delete(`/listings/${id}`),
};

// Search
export const searchAPI = {
  search: (params: any) => api.get('/search', { params }),
};

// Inquiries
export const inquiriesAPI = {
  create: (data: { listing_id: number; message: string }) => api.post('/inquiries', data),
  getSent: () => api.get('/inquiries/sent'),
  getReceived: () => api.get('/inquiries/received'),
  respond: (id: number, data: { status: string; owner_response: string }) => api.put(`/inquiries/${id}/respond`, data),
};

// Reviews
export const reviewsAPI = {
  create: (data: any) => api.post('/reviews', data),
  getByListing: (listingId: number) => api.get(`/reviews/listing/${listingId}`),
};

// Favorites
export const favoritesAPI = {
  toggle: (listingId: number) => api.post(`/favorites/${listingId}`),
  getAll: () => api.get('/favorites'),
};

// Admin
export const adminAPI = {
  getPending: () => api.get('/admin/listings/pending'),
  approve: (id: number) => api.put(`/admin/listings/${id}/approve`),
  reject: (id: number) => api.put(`/admin/listings/${id}/reject`),
  getAnalytics: () => api.get('/admin/analytics'),
  getUsers: () => api.get('/admin/users'),
  getReports: () => api.get('/admin/reports'),
};

// Roommate
export const roommateAPI = {
  getProfile: () => api.get('/roommate/profile'),
  saveProfile: (data: any) => api.post('/roommate/profile', data),
  getMatches: () => api.get('/roommate/matches'),
};

export default api;

const chatAPI = {
  send: (payload: { message: string }) => api.post('/chat', payload),
};

export { chatAPI };
