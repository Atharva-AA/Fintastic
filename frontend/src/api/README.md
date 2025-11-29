# Fintastic API Layer

This directory contains all API communication logic for the Fintastic frontend application.

## Structure

```
/api
├── base.ts              # Base axios instance with interceptors
├── auth.api.ts          # Authentication endpoints
├── transaction.api.ts   # Transaction endpoints
├── goal.api.ts          # Goal endpoints
└── dashboard.api.ts     # Dashboard endpoints
```

## Configuration

### Base Configuration (`base.ts`)
- **Base URL**: `http://localhost:5000`
- **Credentials**: Enabled (for HTTP-only cookies)
- **Interceptors**: 
  - 401 responses automatically redirect to `/` (landing/login)

### CORS Setup
Backend is configured to accept requests from:
- Origin: `http://localhost:5173` (Vite dev server)
- Credentials: Enabled

## Authentication Flow

### Signup
```typescript
import { signupUser } from '../api/auth.api';

await signupUser({
  name: "John Doe",
  email: "john@example.com",
  mobile: "9876543210",
  password: "password123",
  confirmPassword: "password123"
});
```

**Backend Endpoint**: `POST /api/auth/register`

**On Success**: Redirects to `/onboarding`

### Login
```typescript
import { loginUser } from '../api/auth.api';

await loginUser({
  email: "john@example.com",
  password: "password123"
});
```

**Backend Endpoint**: `POST /api/auth/login`

**On Success**: Redirects to `/dashboard`

### Logout
```typescript
import { logoutUser } from '../api/auth.api';

await logoutUser();
```

**Backend Endpoint**: `POST /api/auth/logout`

## Cookie-Based Authentication

The application uses **HTTP-only cookies** for JWT storage:

1. **Backend** sets the cookie on successful login/signup
2. **Frontend** automatically sends the cookie with every request (`withCredentials: true`)
3. **No manual token management** required in frontend code
4. **Automatic logout** on 401 responses via interceptor

## Usage Rules

✅ **DO**:
- Import API functions from `/api` modules
- Use the provided API functions in components
- Handle errors with try-catch blocks
- Show loading states during API calls

❌ **DON'T**:
- Use axios or fetch directly in components
- Store tokens in localStorage
- Manually manage authentication state
- Make API calls outside of `/api` modules

## Example Component Usage

```typescript
import { useState } from 'react';
import { loginUser } from '../api/auth.api';

function LoginComponent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');
    
    try {
      await loginUser({ email, password });
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component
}
```

## Adding New Endpoints

To add a new API endpoint:

1. Add the function to the appropriate API file (or create a new one)
2. Use the `api` instance from `base.ts`
3. Add TypeScript types for request/response data
4. Export the function

Example:
```typescript
// In transaction.api.ts
import api from "./base";

interface TransactionData {
  amount: number;
  description: string;
}

export const createTransaction = (data: TransactionData) => {
  return api.post("/api/transactions", data);
};
```
