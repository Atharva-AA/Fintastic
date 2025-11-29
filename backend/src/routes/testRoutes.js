import express from 'express';
import { testEmail } from '../controllers/testEmailController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Test email endpoint
router.post('/email', protect, testEmail);

export default router;

