import api from '../api/base';

// Cookie-based auth - no token needed, cookies are sent automatically
export const getDashboardData = async () => {
  const response = await api.get('/api/dashboard');
  return response.data;
};

