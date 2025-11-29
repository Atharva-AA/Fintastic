import api from '../api/base';

/**
 * Send a chat message to the AI agent.
 * Authentication is handled automatically via HTTP-only cookies.
 * The api instance (withCredentials: true) sends cookies with each request.
 */
export const sendChatMessage = async (message) => {
  const response = await api.post('/api/chat', { message });
  return response.data;
};


