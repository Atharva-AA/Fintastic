import express from 'express';
import { getBehaviorProfile } from '../controllers/behaviorController.js';

const router = express.Router();

router.get('/:userId', getBehaviorProfile);

export default router;
