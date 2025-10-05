# Quick Fix: Render Email Timeout (5 Minutes)

## The Problem
```
❌ Error sending verification email: Error: Connection timeout
code: 'ETIMEDOUT'
```

## The Cause
Render blocks SMTP ports → Gmail/Outlook won't work

## The Solution
Use SendGrid (free, works on Render)

---

## Quick Steps

### 1. Get SendGrid API Key (2 minutes)
1. Go to https://sendgrid.com/ → Sign up (free)
2. Settings → API Keys → Create API Key
3. Copy the key (starts with `SG.`)

### 2. Verify Sender Email (1 minute)
1. Settings → Sender Authentication → Verify a Single Sender
2. Use your email (e.g., `your-email@gmail.com`)
3. Check email → Click verification link

### 3. Update Render Environment (1 minute)
1. Render Dashboard → Your service → Environment
2. Change these variables:
   ```
   EMAIL_PROVIDER = sendgrid
   SENDGRID_API_KEY = SG.your-actual-key-here
   SENDGRID_FROM_EMAIL = CARS-G <your-verified-email@gmail.com>
   ```
3. Click "Save Changes"

### 4. Deploy (1 minute)
```bash
git add .
git commit -m "Fix email timeout with SendGrid"
git push
```

Wait for Render to redeploy (auto-deploys on push).

---

## Verify It Works

Check Render logs for:
```
✅ SendGrid SMTP transporter initialized
✅ Email sent successfully
```

Test registration → Should receive email!

---

## Need Help?
See `RENDER_EMAIL_FIX.md` for detailed instructions.
