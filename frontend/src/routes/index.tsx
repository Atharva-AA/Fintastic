import { createBrowserRouter } from 'react-router-dom';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Onboarding from '../pages/Onboarding';
import Dashboard from '../pages/Dashboard';
import Income from '../pages/Income';
import Expenses from '../pages/Expenses';
import Goals from '../pages/Goals';
import Investments from '../pages/Investments';
import Timeline from '../pages/Timeline';
import Profile from '../pages/Profile';
import AI from '../pages/AI';
import FinanceTutor from '../pages/finance-tutor';
import ErrorFallback from '../pages/ErrorFallback';

/**
 * Main router configuration for Fintastic
 * Maps all routes to their corresponding page components
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/login',
    element: <Login />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/signup',
    element: <Signup />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/onboarding/:stepSlug?',
    element: <Onboarding />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/income',
    element: <Income />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/expenses',
    element: <Expenses />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/goals',
    element: <Goals />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/investments',
    element: <Investments />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/timeline',
    element: <Timeline />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/profile',
    element: <Profile />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/ai',
    element: <AI />,
    errorElement: <ErrorFallback />,
  },
  {
    path: '/finance-tutor',
    element: <FinanceTutor />,
    errorElement: <ErrorFallback />,
  },
]);
