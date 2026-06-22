import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  signup: (data: any) => api.post('/auth/signup', data),
  me: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
};

export const reportAPI = {
  create: (data: any) => api.post('/reports', data),
  getAll: () => api.get('/reports'),
  getById: (id: string) => api.get(`/reports/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/reports/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/reports/${id}`),
};

export const chatAPI = {
  startDirect: () => api.post('/chat/direct'),
  getAll: () => api.get('/chat'),
  getById: (id: string) => api.get(`/chat/${id}`),
  sendMessage: (id: string, message: string) => api.post(`/chat/${id}/message`, { message }),
  markRead: (id: string, role: string) => api.patch(`/chat/${id}/read`, { role }),
  delete: (citizenId: string) => api.delete(`/chat/${citizenId}`),
};

export default api;

export const locationAPI = {
  update: (lat: number, lng: number) => api.post('/location', { lat, lng }),
  getAll: () => api.get('/locations'),
};
