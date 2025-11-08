# Cleanup API Functions to Stay Under Vercel Hobby Limit

## Problem
- You have 21 API functions
- Vercel Hobby plan only allows 12
- Need to remove 9 functions

## Solution: Remove Duplicate/Unused Functions

### Functions to DELETE (9 total):

1. **`api/auth/register-otp-express.js`** - Duplicate of register-otp.js
2. **`api/auth/verify-otp-express.js`** - Duplicate of verify-otp.js  
3. **`api/auth/resend-otp-express.js`** - Duplicate of resend-otp.js
4. **`api/auth/upload-id-simple.js`** - Duplicate
5. **`api/auth/upload-id-documents.js`** - Duplicate
6. **`api/auth/upload-id.js`** - Keep only one upload function (keep upload/id-images.js)
7. **`api/auth/verify-email.js`** - Keep confirm-email.js instead
8. **`api/upload/id-images.js`** - This is a duplicate (keep auth/upload-id.js or vice versa)
9. **`api/background/process-verifications.js`** - Move to main server if needed

### Functions to KEEP (12 total):

1. `api/admin/verification-queue.js` ✅
2. `api/admin/verification-requests.js` ✅
3. `api/admin/verify-user.js` ✅
4. `api/ai/auto-verify.js` ✅
5. `api/ai/verify-id.js` ✅
6. `api/auth/register.js` ✅
7. `api/auth/register-otp.js` ✅
8. `api/auth/verify-otp.js` ✅ (USED)
9. `api/auth/resend-otp.js` ✅ (USED)
10. `api/auth/confirm-email.js` ✅
11. `api/cleanup/unverified-accounts.js` ✅
12. `api/webhooks/brevo-bounce.js` ✅

## Quick Fix Script

Run this to delete the duplicate functions:

```bash
# Delete duplicate express versions
rm api/auth/register-otp-express.js
rm api/auth/verify-otp-express.js
rm api/auth/resend-otp-express.js

# Delete duplicate upload functions
rm api/auth/upload-id-simple.js
rm api/auth/upload-id-documents.js
rm api/auth/upload-id.js

# Delete duplicate verify-email
rm api/auth/verify-email.js

# Delete duplicate upload
rm api/upload/id-images.js

# Delete background function (move to main server if needed)
rm api/background/process-verifications.js
```

## After Cleanup
- You'll have exactly 12 functions
- All duplicates removed
- All used functions kept
- Ready to deploy on Vercel Hobby plan

