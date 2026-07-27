import axios from 'axios';
import { readStoredAuth, clearStoredAuth, loginPathForRole } from '../auth/storage.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const { token } = readStoredAuth();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const { role } = readStoredAuth();
      clearStoredAuth();
      const loginPath = loginPathForRole(role);
      if (window.location.pathname !== loginPath) {
        window.location.assign(loginPath);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
