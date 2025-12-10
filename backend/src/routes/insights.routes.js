import express from 'express';
import { getPageInsights, getAllAlerts } from '../controllers/insights.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Insights Routes
 * Fetch AI-generated insights for different pages
 */

// Get insights for a specific page
router.get('/insights/:page', protect, getPageInsights);

// Get all alerts for the user
router.get('/alerts', protect, getAllAlerts);

export default router;
