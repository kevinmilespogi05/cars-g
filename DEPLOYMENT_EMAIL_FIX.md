# Registration Timeout Fix - Deployment Guide

## Issues Fixed

1. **Circular dependency error** in `debug.ts` - Fixed by passing config as parameter
2. **Registration timeout error** - Fixed by adding timeouts to email service and improving error handling

## Changes Made

### 1. Fixed Circular Dependency (`src/lib/debug.ts` & `src/lib/config.ts`)
- Modified `debugApiConfig()` to accept `apiBaseUrl` as a parameter instead of importing `config`
- Updated the call in `config.ts` to pass `config.api.baseUrl`

### 2. Added Email Service Timeouts (`server/lib/nodemailerService.js`)
- Added 10-second timeouts to all SMTP transporter configurations:
  - `connectionTimeout: 10000`
  - `greetingTimeout: 10000`
  - `socketTimeout: 10000`
- This prevents the email service from hanging indefinitely

### 3. Improved Server Error Handling (`server/server.js`)
- Wrapped email sending in a Promise.race() with 10-second timeout
- In production, if email fails, the system now:
  - Logs the error
  - Still stores the verification code in the database
  - Returns success to allow registration to proceed
  - Provides a helpful message to the user

### 4. Increased Frontend Timeout (`src/pages/Register.tsx`)
- Increased client-side timeout from 12 to 15 seconds
- This gives the server more time to process the request

## Email Configuration for Production

The timeout issue is likely caused by missing or incorrect email configuration in your deployed environment. 

### Required Environment Variables

Add these to your deployment platform (Vercel/Netlify/Render):

#### Option 1: Gmail (Recommended)
```env
EMAIL_PROVIDER=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
EMAIL_SENDER=CARS-G <your-email@gmail.com>
```

**How to get Gmail App Password:**
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → 2-Step Verification → App passwords
4. Generate a new app password for "Mail"
5. Use the 16-character password (no spaces)

#### Option 2: Outlook/Hotmail
```env
EMAIL_PROVIDER=outlook
OUTLOOK_USER=your-email@outlook.com
OUTLOOK_PASSWORD=your-password
EMAIL_SENDER=CARS-G <your-email@outlook.com>
```

#### Option 3: Custom SMTP
```env
EMAIL_PROVIDER=custom
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_SECURE=false
EMAIL_SENDER=CARS-G <noreply@your-domain.com>
```

### Testing Email Configuration

After deploying, you can test if emails are working by:

1. Check server logs for email initialization messages:
   - `✅ Gmail SMTP transporter initialized` (success)
   - `⚠️  Gmail credentials not set` (missing config)

2. Try registering - even if email fails, registration should now proceed

3. Check server logs during registration:
   - `✅ Email sent successfully` (working)
   - `⚠️  Email sending failed: [error]` (configuration issue)

## Deployment Steps

1. **Commit and push changes:**
   ```bash
   git add .
   git commit -m "Fix registration timeout and email service configuration"
   git push
   ```

2. **Configure environment variables** in your deployment platform:
   - Add the email configuration variables listed above
   - Make sure `NODE_ENV=production` is set

3. **Redeploy the application**

4. **Test registration:**
   - Try creating an account
   - Should no longer see "Request timed out" error
   - If email is configured correctly, you'll receive verification code
   - If email is not configured, registration will still proceed but log warnings

## Fallback Behavior

With these fixes:
- ✅ Registration will NOT timeout
- ✅ If email fails, the verification code is still stored
- ✅ User can proceed with registration
- ⚠️  In production, if email fails, user sees: "Verification code created. If you don't receive an email, please contact support."
- 📝 Server logs will show detailed error messages for debugging

## Troubleshooting

### Still seeing timeout errors?
1. Check if API URL is correct in deployment
2. Verify server is running and accessible
3. Check server logs for detailed error messages

### Email not sending?
1. Verify environment variables are set correctly
2. Check Gmail/Outlook security settings
3. For Gmail, ensure App Password is used (not regular password)
4. Check server logs for specific email errors

### Need to manually verify users?
If email is not working, you can manually verify users by:
1. Checking the `email_verifications` table in Supabase
2. Getting the verification code
3. Providing it to the user through another channel

## Support

If issues persist:
1. Check server logs for detailed error messages
2. Verify all environment variables are set
3. Test email configuration using the test scripts in `server/` directory
4. Ensure firewall/network allows SMTP connections (ports 587/465)
