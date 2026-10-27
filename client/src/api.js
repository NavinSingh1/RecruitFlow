import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('rf_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  const isAuthCall = err.config?.url?.startsWith('/auth/');
  if (err.response?.status === 401 && !isAuthCall) {
    localStorage.removeItem('rf_token');
    window.location.assign('/login');
  }
  return Promise.reject(err);
});

export const errMsg = (e) => e.response?.data?.message || 'Could not reach the server. Try again.';
export default api;
