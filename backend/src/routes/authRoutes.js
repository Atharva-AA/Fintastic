import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
} from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

// POST /api/auth/logout
router.post('/logout', logoutUser);

// GET /api/auth/mentor/users

export default router;
