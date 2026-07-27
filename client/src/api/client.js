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
    // A 401 from an auth endpoint itself (e.g. wrong password on login) means
    // "this attempt was rejected," not "your session died" - redirecting here
    // would blow away the login/register form the user is actively using.
    // Only a 401 from an already-authenticated request means the session is
    // actually invalid.
    const isAuthEndpoint = err.config?.url?.includes('/auth/');
    if (err.response?.status === 401 && !isAuthEndpoint) {
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
