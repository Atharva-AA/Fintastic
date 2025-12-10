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
import decisionRoutes from './routes/decisionRoutes.js';
import gmailRoutes from './routes/gmail.routes.js';
import bankRoutes from './routes/bank.routes.js';
import aiInternalRoutes from './routes/ai.internal.routes.js';
import insightsRoutes from './routes/insights.routes.js';
import aiInsightsRoutes from './routes/aiInsights.routes.js';
import tutorRoutes from './routes/tutor.routes.js';

import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();
app.use(morgan('dev'));

/**
 * Middleware
 */

// CORS configuration - MUST be before other middleware
// This automatically handles preflight OPTIONS requests
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Chrome extensions)
      if (!origin) {
        console.log('✅ CORS: Allowing request with no origin');
        return callback(null, true);
      }

      console.log('🌐 CORS: Request from origin:', origin);

      // Allow Chrome extensions (all chrome-extension:// origins)
      if (origin.startsWith('chrome-extension://')) {
        console.log('✅ CORS: Allowing Chrome extension');
        return callback(null, true);
      }

      // Allow specific origins
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://localhost:8001',
        'http://127.0.0.1:8001',
        'https://www.amazon.in',
        'https://www.amazon.com',
        'https://www.flipkart.com',
        'https://flipkart.com',
      ];

      if (allowedOrigins.includes(origin)) {
        console.log('✅ CORS: Allowing origin:', origin);
        callback(null, true);
      } else {
        console.log('❌ CORS: Blocking origin:', origin);
        callback(null, false); // <-- important change
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-ai-secret',
      'x-internal-access',
    ],
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
app.use('/decision', decisionRoutes);
app.use('/gmail', gmailRoutes);
app.use('/bank', bankRoutes);
app.use('/api/ai-internal', aiInternalRoutes);
app.use('/api', insightsRoutes);
app.use('/api/ai/insights', aiInsightsRoutes);
app.use('/api/tutor', tutorRoutes);

export default app;
