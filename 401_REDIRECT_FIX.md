# ✅ Fixed: 401 Redirect Issue

## Problem
When login/signup failed with invalid credentials, the 401 interceptor was automatically redirecting users to the landing page ("/"), preventing error messages from being displayed.

## Solution
Updated the axios interceptor in both `base.js` and `base.ts` to **exclude auth endpoints** from automatic redirect.

## Changes Made

### Files Modified:
1. `/frontend/src/api/base.js`
2. `/frontend/src/api/base.ts`

### Updated Interceptor Logic:

**Before:**
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      window.location.href = "/"; // Always redirected!
    }
    return Promise.reject(error);
  }
);
```

**After:**
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to landing on 401 if it's NOT a login/signup request
    // (those should show error messages, not redirect)
    const isAuthEndpoint = error?.config?.url?.includes('/auth/');
    
    if (error?.response?.status === 401 && !isAuthEndpoint) {
      window.location.href = "/"; // Only redirect for protected routes
    }
    return Promise.reject(error);
  }
);
```

## Behavior Now

### Auth Endpoints (login/signup):
- ✅ 401 error → **Shows error message** (stays on page)
- ✅ User sees "Invalid credentials" or "User not found"
- ✅ No automatic redirect

### Protected Routes (dashboard, transactions, etc.):
- ✅ 401 error → **Redirects to landing page** (user not authenticated)
- ✅ Automatic logout behavior

## Testing

### Test Login Error:
1. Go to `/login`
2. Enter wrong password
3. Click "Sign in"
4. ✅ Should see "Invalid credentials" below button
5. ✅ Should **NOT** redirect to landing page

### Test Signup Error:
1. Go to `/signup`
2. Enter existing email
3. Click "Create account"
4. ✅ Should see "User already exists" below button
5. ✅ Should **NOT** redirect to landing page

### Test Protected Route:
1. Logout (clear cookies)
2. Try to access `/dashboard`
3. ✅ Should redirect to `/` (landing page)

## Summary

✅ **Login/Signup errors now display properly**
✅ **No unwanted redirects on auth pages**
✅ **Protected routes still redirect on 401**
✅ **Error messages visible to users**

The issue is now fixed! Users will see error messages instead of being redirected away from the login/signup pages.
