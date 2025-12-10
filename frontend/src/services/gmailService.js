import api from '../api/base';
import axios from 'axios';

/**
 * Connect user's Gmail account
 * GET http://localhost:8001/gmail/connect/{userId}
 * Returns OAuth URL to open in popup
 */
export const connectGmail = async (userId) => {
  try {
    const response = await axios.get(`http://localhost:8001/gmail/connect/${userId}`, {
      withCredentials: false,
    });
    return response.data;
  } catch (err) {
    console.error('Gmail connect error:', err);
    throw err;
  }
};

/**
 * Get pending Gmail transactions for a user
 * GET http://localhost:3000/gmail/pending/{userId}
 */
export const getPendingGmailTransactions = async (userId) => {
  const response = await api.get(`/gmail/pending/${userId}`);
  return response.data;
};

/**
 * Approve a pending Gmail transaction
 * POST http://localhost:3000/gmail/approve
 * Body: { pendingId }
 */
export const approvePendingTransaction = async (pendingId) => {
  const response = await api.post('/gmail/approve', { pendingId });
  return response.data;
};

/**
 * Reject a pending Gmail transaction
 * POST http://localhost:3000/gmail/reject
 * Body: { pendingId }
 */
export const rejectPendingTransaction = async (pendingId) => {
  const response = await api.post('/gmail/reject', { pendingId });
  return response.data;
};

