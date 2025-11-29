import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getDashboardData, getDashboardInsights } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', protect, getDashboardData);
router.get('/insights', protect, getDashboardInsights);

export default router;

