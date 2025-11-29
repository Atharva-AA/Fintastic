import express from 'express';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import aiRoutes from './routes/ai.routes.js';
import dailyRoutes from './routes/dailyRoutes.js';
import userRoutes from './routes/userRoutes.js';
import behaviorRoutes from './routes/behavior.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import incomeRoutes from './routes/income.routes.js';
import latestDataRoutes from './routes/latestData.routes.js';
import testRoutes from './routes/testRoutes.js';

import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();
app.use(morgan('dev'));

/**
 * Middleware
 */

// CORS configuration - MUST be before other middleware
app.use(
  cors({
    origin: 'http://localhost:5173', // Frontend URL
    credentials: true, // Allow cookies
  })
);

app.use(cookieParser());
app.use(express.json());

/**
 * Health check route
 */
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: '🚀 Fintastic backend is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRoutes);

app.use('/api', chatRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/behavior', behaviorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/latest-data', latestDataRoutes);
app.use('/api/test', testRoutes);

export default app;
