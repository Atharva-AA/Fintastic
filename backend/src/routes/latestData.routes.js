import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getLatestFinancialData } from '../controllers/latestDataController.js';

const router = express.Router();

// Internal access route (for AI service)
router.get('/latest', getLatestFinancialData);

// Protected route (for authenticated users)
router.get('/', protect, getLatestFinancialData);

export default router;

