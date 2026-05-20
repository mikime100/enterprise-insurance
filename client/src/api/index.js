import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  res => res,
  err => {
    const isAuthCheck = err.config?.url?.includes('/auth/me');
    const isPublicPath = ['/', '/login', '/register', '/broker-apply'].includes(window.location.pathname);
    if (err.response?.status === 401 && !isAuthCheck && !isPublicPath) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
