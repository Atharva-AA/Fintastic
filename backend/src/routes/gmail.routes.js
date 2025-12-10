import express from 'express';
import {
  savePending,
  getPending,
  approvePending,
  rejectPending,
  updateGmailConnectionStatus,
} from '../controllers/gmail.controller.js';

const router = express.Router();

/**
 * POST /gmail/save-pending
 * Save pending Gmail transaction from AI-Service
 * Body: { userId, gmailMessageId, amount, text, type }
 */
router.post('/save-pending', savePending);

/**
 * GET /gmail/pending/:userId
 * Get all pending transactions for a user
 */
router.get('/pending/:userId', getPending);

/**
 * POST /gmail/approve
 * Approve pending transaction and convert to real transaction
 * Body: { pendingId }
 */
router.post('/approve', approvePending);

/**
 * POST /gmail/reject
 * Reject pending transaction
 * Body: { pendingId }
 */
router.post('/reject', rejectPending);

/**
 * POST /gmail/connect-status
 * Create or update GmailToken record when Gmail is connected
 * Body: { userId, email }
 */
router.post('/connect-status', updateGmailConnectionStatus);

export default router;
