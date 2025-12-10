import express from 'express';
import {
  getVideos,
  getMarketDataController,
  placeTrade,
  getPortfolio,
  getOrders,
  calculateSIP,
} from '../controllers/tutorController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/videos', getVideos);

// Protected routes
router.get('/market-data/:symbol', protect, getMarketDataController);
router.post('/trade', protect, placeTrade);
router.get('/portfolio', protect, getPortfolio);
router.get('/orders', protect, getOrders);
router.post('/calculate-sip', protect, calculateSIP);

export default router;

