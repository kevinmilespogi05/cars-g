# Facebook OAuth Setup Guide

## Current Issue
Facebook OAuth is not enabled in your Supabase project, causing the error:
```
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

## Steps to Enable Facebook OAuth

### 1. Create a Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Consumer" app type
4. Fill in app details and create

### 2. Configure Facebook App
1. In your Facebook app dashboard, go to **Settings** → **Basic**
2. Note your **App ID** and **App Secret**
3. Go to **Facebook Login** → **Settings**
4. Add these URLs to **Valid OAuth Redirect URIs**:
   ```
   https://mffuqdwqjdxbwpbhuxby.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback
   ```

### 3. Enable Facebook in Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`mffuqdwqjdxbwpbhuxby`)
3. Navigate to **Authentication** → **Providers**
4. Find **Facebook** and toggle it **ON**
5. Enter your Facebook **App ID** and **App Secret**
6. Save the configuration

### 4. Test the Integration
1. Restart your development server
2. Try signing in with Facebook
3. The error should be resolved

## Alternative: Disable Facebook Button Temporarily

If you don't want to set up Facebook OAuth right now, you can temporarily hide the Facebook button by commenting out the Facebook sign-in button in:
- `src/pages/Login.tsx`
- `src/pages/Register.tsx`

## Current Error Handling
The app now shows a user-friendly error message when Facebook OAuth is not available:
> "Facebook sign-in is not available. Please use email/password or Google sign-in instead."

This allows users to continue using other authentication methods while Facebook OAuth is being set up.
