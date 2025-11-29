import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { chatWithAgent } from '../controllers/chatController.js';
``;
const router = express.Router();

// MAIN CHAT ENDPOINT
router.post('/chat', protect, chatWithAgent);

export default router;
