import express from 'express';
import { canIBuy } from '../controllers/decisionController.js';

const router = express.Router();

router.post('/can-i-buy', canIBuy);

export default router;

