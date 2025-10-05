# API Connection Fix for Cars-G

## Problem
The deployed frontend is trying to connect to `http://localhost:3001/api/performance` instead of the production API URL `https://cars-g-api.onrender.com/api/performance`.

## Root Cause
The frontend configuration relies on environment variables that may not be properly set in the Vercel deployment.

## Solution Applied

### 1. Enhanced Configuration Detection
Updated `src/lib/config.ts` to use more robust environment detection:
- Checks both `import.meta.env.DEV` and `window.location.hostname`
- Falls back to production URL if environment variables are not set
- Added debugging logs to help troubleshoot connection issues

### 2. Added Debugging
Enhanced both PerformanceMonitor components with better error logging:
- Logs the API URL being used
- Provides detailed error messages
- Helps identify connection issues in production

### 3. Created API Testing Script
Added `scripts/test-api-endpoint.js` to verify API connectivity:
- Tests the production API endpoint
- Shows response times and data
- Helps verify backend is working correctly

## Verification Steps

### Backend API Status ✅
- ✅ Production API is accessible: `https://cars-g-api.onrender.com/api/performance`
- ✅ Health endpoint working: `https://cars-g-api.onrender.com/health`
- ✅ Response time: ~350-400ms (acceptable for free tier)
- ✅ CORS properly configured

### Frontend Configuration
The frontend should now:
1. Detect production environment correctly
2. Use `https://cars-g-api.onrender.com` as the API base URL
3. Provide better error messages if connection fails

## Environment Variables Required

### For Vercel Deployment
Set these environment variables in your Vercel project settings:

```
VITE_API_URL=https://cars-g-api.onrender.com
VITE_SUPABASE_URL=https://mffuqdwqjdxbwpbhuxby.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_FIREBASE_API_KEY=AIzaSyBaDNk0l_Hveq0r4xp15-K_Zm2uFwhkIPs
VITE_FIREBASE_AUTH_DOMAIN=carsg-d5bed.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=carsg-d5bed
VITE_FIREBASE_MESSAGING_SENDER_ID=672452977686
VITE_FIREBASE_APP_ID=1:672452977686:web:109661be796952ddbf8137
VITE_FIREBASE_VAPID_KEY=BIwpimX2-4_1EwjnCHpGnNVRca-5dqETfdBOzl2ajY6lm5hqOk0pkj1RDI8QTpK20QOIxi16ietGrwsIxqe6lUo
VITE_CLOUDINARY_CLOUD_NAME=dzqtdl5aa
VITE_CLOUDINARY_API_KEY=829735821883862
VITE_CLOUDINARY_API_SECRET=jp8xklrseBVvN13Jba7zPJ7BXPc
VITE_CLOUDINARY_UPLOAD_PRESET=cars-g-uploads
```

## Testing the Fix

1. **Deploy the updated code** to Vercel
2. **Check browser console** for debug messages:
   - Should see: `PerformanceMonitor: Using API URL: https://cars-g-api.onrender.com`
   - Should NOT see: `PerformanceMonitor: Using API URL: http://localhost:3001`

3. **Test the Performance Monitor**:
   - Open the deployed website
   - Click the Performance Monitor button (bottom right)
   - Should show server metrics instead of connection errors

## Fallback Behavior

If the API is still not accessible, the Performance Monitor will:
- Show client-side metrics only
- Display "Initializing..." status
- Log detailed error information to console
- Not crash the application

## Next Steps

1. **Deploy the changes** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Test the deployed application**
4. **Monitor console logs** for any remaining issues

The fix should resolve the `ERR_CONNECTION_REFUSED` error and allow the Performance Monitor to work correctly in production.
