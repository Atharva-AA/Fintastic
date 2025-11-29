import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';

    if (status === 401 && !requestUrl.includes('/api/auth/')) {
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

export default api;
