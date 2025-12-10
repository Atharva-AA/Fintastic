import express from 'express';
import { 
  getRecentTransactions, 
  getUserGoals, 
  getBehaviorProfile 
} from '../controllers/ai.internal.controller.js';
import { verifyAiSecret } from '../middleware/verifyAiSecret.js';

const router = express.Router();

/**
 * AI Internal Routes
 * Protected by x-ai-secret header for AI service access only
 */

// Middleware to verify AI secret for all routes
router.use(verifyAiSecret);

/**
 * POST /api/ai/get-recent-transactions
 * Fetch recent transactions for AI context
 */
router.post('/get-recent-transactions', getRecentTransactions);

/**
 * POST /api/ai/get-user-goals
 * Fetch user goals with progress calculations
 */
router.post('/get-user-goals', getUserGoals);

/**
 * POST /api/ai/get-behavior-profile
 * Fetch user behavior profile data
 */
router.post('/get-behavior-profile', getBehaviorProfile);

export default router;
