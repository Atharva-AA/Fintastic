import { getAllUsersForMentor } from '../controllers/userController.js';
import express from 'express';

const router = express.Router();

router.get('/', getAllUsersForMentor);

export default router;
