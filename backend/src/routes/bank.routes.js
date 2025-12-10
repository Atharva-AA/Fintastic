import express from 'express';
import {
  savePendingBankTx,
  getPendingBankTx,
  approvePendingBankTx,
  rejectPendingBankTx,
} from '../controllers/bank.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /bank/save-pending
 * Save pending bank transaction from AI-Service
 * Headers: x-ai-secret (for authentication)
 */
router.post('/save-pending', savePendingBankTx);

/**
 * GET /bank/pending/:userId
 * Get all pending bank transactions for a user
 */
router.get('/pending/:userId', protect, getPendingBankTx);

/**
 * POST /bank/approve
 * Approve pending bank transaction and convert to real transaction
 * Body: { pendingId }
 */
router.post('/approve', protect, approvePendingBankTx);

/**
 * POST /bank/reject
 * Reject pending bank transaction
 * Body: { pendingId }
 */
router.post('/reject', protect, rejectPendingBankTx);

export default router;
