import express from 'express';

import { getDailyMentorData } from '../controllers/dailyController.js';
``;
const router = express.Router();

// MAIN CHAT ENDPOINT
router.get('/:userId', getDailyMentorData);

export default router;
