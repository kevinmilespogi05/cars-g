# API Functions Analysis - Vercel Hobby Plan Limit

## Current Status
- **Total API Functions**: 21
- **Vercel Hobby Limit**: 12
- **Excess**: 9 functions need to be removed or consolidated

## API Functions List

### Admin Functions (3)
1. `/api/admin/verification-queue.js`
2. `/api/admin/verification-requests.js`
3. `/api/admin/verify-user.js`

### AI Functions (2)
4. `/api/ai/auto-verify.js`
5. `/api/ai/verify-id.js`

### Auth Functions (11) - **LOTS OF DUPLICATES**
6. `/api/auth/register.js`
7. `/api/auth/register-otp.js` ⚠️ **DUPLICATE**
8. `/api/auth/register-otp-express.js` ⚠️ **DUPLICATE**
9. `/api/auth/verify-otp.js` ✅ **USED**
10. `/api/auth/verify-otp-express.js` ⚠️ **DUPLICATE**
11. `/api/auth/resend-otp.js` ✅ **USED**
12. `/api/auth/resend-otp-express.js` ⚠️ **DUPLICATE**
13. `/api/auth/upload-id.js` ⚠️ **DUPLICATE**
14. `/api/auth/upload-id-simple.js` ⚠️ **DUPLICATE**
15. `/api/auth/upload-id-documents.js` ⚠️ **DUPLICATE**
16. `/api/auth/verify-email.js` ⚠️ **POSSIBLE DUPLICATE**
17. `/api/auth/confirm-email.js` ⚠️ **POSSIBLE DUPLICATE**

### Background/Cleanup Functions (2)
18. `/api/background/process-verifications.js`
19. `/api/cleanup/unverified-accounts.js`

### Upload Functions (1)
20. `/api/upload/id-images.js` ⚠️ **DUPLICATE**

### Webhooks (1)
21. `/api/webhooks/brevo-bounce.js`

## Recommended Actions

### Option 1: Remove Duplicate Functions (Recommended)
Remove all duplicate/unused functions to get under 12:

**Remove these duplicates (9 functions):**
1. `register-otp-express.js` (duplicate of register-otp.js)
2. `verify-otp-express.js` (duplicate of verify-otp.js)
3. `resend-otp-express.js` (duplicate of resend-otp.js)
4. `upload-id-simple.js` (duplicate)
5. `upload-id-documents.js` (duplicate)
6. `upload-id.js` (keep only one upload function)
7. `verify-email.js` or `confirm-email.js` (consolidate)
8. `upload/id-images.js` (duplicate)
9. `background/process-verifications.js` (move to main server if needed)

**Keep these (12 functions):**
1. `admin/verification-queue.js`
2. `admin/verification-requests.js`
3. `admin/verify-user.js`
4. `ai/auto-verify.js`
5. `ai/verify-id.js`
6. `auth/register.js`
7. `auth/register-otp.js`
8. `auth/verify-otp.js` ✅
9. `auth/resend-otp.js` ✅
10. `auth/upload-id.js` (or keep one upload function)
11. `auth/confirm-email.js` (or verify-email.js)
12. `webhooks/brevo-bounce.js`

### Option 2: Move to Main Server
Since you're using Render.com for the main backend (`https://cars-g-api.onrender.com`), consider:
- Moving most API functions to the main server.js
- Only keep essential Vercel serverless functions
- Use Vercel functions only for webhooks or Vercel-specific features

### Option 3: Upgrade to Pro Plan
- Upgrade to Vercel Pro plan ($20/month)
- Allows unlimited serverless functions

## Next Steps
1. Check which functions are actually being called from the frontend
2. Remove duplicate functions
3. Consolidate similar functions
4. Move non-essential functions to main server if possible

