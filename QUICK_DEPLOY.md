# ⚡ Quick Deploy Guide

## 1️⃣ Deploy Code (Run These Commands)

```bash
# Stage all changes
git add .

# Commit with message
git commit -m "Fix registration timeout and email configuration"

# Push to deploy
git push origin main
```

## 2️⃣ Setup Gmail App Password

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not enabled)
3. Go to **App passwords** (under 2-Step Verification)
4. Create new app password:
   - App: **Mail**
   - Device: **Other (Custom name)** → Type "CARS-G"
5. **Copy the 16-character password** (example: `abcd efgh ijkl mnop`)

## 3️⃣ Update Render (Backend)

1. Go to: https://dashboard.render.com/
2. Click on **cars-g-api** service
3. Go to **Environment** tab
4. Add these two variables:

   ```
   GMAIL_USER = your-email@gmail.com
   GMAIL_APP_PASSWORD = abcdefghijklmnop (no spaces)
   ```

5. Click **Save Changes**
6. Wait for auto-redeploy (~3 minutes)

## 4️⃣ Test

1. Go to: https://cars-g.vercel.app/register
2. Create an account
3. Should work without timeout! ✅
4. Check email for verification code 📧

---

## ✅ What's Fixed

- ✅ No more "Request timed out" error
- ✅ Registration works even if email fails
- ✅ Email service has proper timeouts
- ✅ Better error messages

## 🔍 Check Deployment Status

**Render Backend:** https://dashboard.render.com/
- Look for: `✅ Gmail SMTP transporter initialized` in logs

**Vercel Frontend:** https://vercel.com/dashboard
- Should auto-deploy from GitHub push

---

## 🆘 Quick Troubleshooting

**Still timing out?**
- Check if API is up: https://cars-g-api.onrender.com/health
- Wait 3-5 minutes after Render deployment

**No email received?**
- Check spam folder
- Verify Gmail credentials in Render
- Check Render logs for email errors

**Need verification code?**
- Check Render logs (shows code in development)
- Or check Supabase `email_verifications` table
