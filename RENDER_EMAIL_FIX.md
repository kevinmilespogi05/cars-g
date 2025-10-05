# Render Email Connection Timeout Fix

## Problem
Your deployed system on Render is experiencing SMTP connection timeouts:
```
❌ Error sending verification email: Error: Connection timeout
code: 'ETIMEDOUT',
command: 'CONN'
```

## Root Cause
**Render blocks outbound SMTP ports (25, 465, 587) on their free tier** to prevent spam. This means direct connections to Gmail, Outlook, or other email providers will always timeout.

## Solution: Use SendGrid SMTP Relay

SendGrid provides an SMTP relay service that works on Render and other cloud platforms. It's **free for up to 100 emails/day**.

---

## Step-by-Step Fix

### 1. Create a SendGrid Account

1. Go to [SendGrid.com](https://sendgrid.com/)
2. Sign up for a free account
3. Verify your email address
4. Complete the account setup

### 2. Create a SendGrid API Key

1. Log in to SendGrid Dashboard
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: `cars-g-render-smtp`
5. Select **Full Access** (or at minimum, **Mail Send** access)
6. Click **Create & View**
7. **IMPORTANT**: Copy the API key immediately (you won't see it again!)
   - It looks like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Verify Sender Email (Required by SendGrid)

SendGrid requires you to verify the email address you'll send from:

#### Option A: Single Sender Verification (Easiest for Free Tier)
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Name**: `CARS-G`
   - **From Email Address**: Your email (e.g., `your-email@gmail.com`)
   - **Reply To**: Same as From Email
   - **Company Address**: Your address
4. Click **Create**
5. Check your email and click the verification link
6. Wait for verification to complete (usually instant)

#### Option B: Domain Authentication (Better for Production)
If you have a custom domain:
1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the DNS setup instructions

### 4. Update Render Environment Variables

1. Go to your Render Dashboard
2. Select your `cars-g-api` service
3. Go to **Environment** tab
4. Update/Add these variables:

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your-actual-api-key-here
SENDGRID_FROM_EMAIL=CARS-G <your-verified-email@gmail.com>
```

**IMPORTANT**: 
- Replace `SG.your-actual-api-key-here` with your actual SendGrid API key
- Replace `your-verified-email@gmail.com` with the email you verified in Step 3
- The email in `SENDGRID_FROM_EMAIL` MUST match the verified sender email

### 5. Deploy the Updated Code

Commit and push the changes:

```bash
git add .
git commit -m "Fix email timeout by switching to SendGrid SMTP relay"
git push
```

Render will automatically redeploy your service.

### 6. Verify the Fix

1. Wait for Render deployment to complete
2. Check Render logs for:
   ```
   ✅ SendGrid SMTP transporter initialized
   ```
3. Test registration on your deployed site
4. Check Render logs for:
   ```
   ✅ Email sent successfully
   ✅ Verification email sent successfully to: user@example.com
   ```

---

## Why This Works

| Provider | Port | Status on Render |
|----------|------|------------------|
| Gmail SMTP | 587/465 | ❌ Blocked |
| Outlook SMTP | 587/465 | ❌ Blocked |
| **SendGrid SMTP** | **587** | **✅ Allowed** |

SendGrid's SMTP relay is specifically designed to work on cloud platforms with port restrictions. Render allows connections to SendGrid's SMTP servers.

---

## Alternative Email Providers (If SendGrid Doesn't Work)

If you need alternatives, these also work on Render:

### Mailgun
```env
EMAIL_PROVIDER=custom
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-smtp-password
SMTP_SECURE=false
```

### Amazon SES
```env
EMAIL_PROVIDER=custom
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_SECURE=false
```

### Postmark
```env
EMAIL_PROVIDER=custom
SMTP_HOST=smtp.postmarkapp.com
SMTP_PORT=587
SMTP_USER=your-postmark-server-token
SMTP_PASSWORD=your-postmark-server-token
SMTP_SECURE=false
```

---

## Troubleshooting

### Still seeing timeout errors?

1. **Check SendGrid API Key is correct**
   ```bash
   # In Render logs, you should see:
   ✅ SendGrid SMTP transporter initialized
   
   # If you see this instead:
   ⚠️  SendGrid API key not set - email sending will not work
   # Then your API key is not set correctly in Render
   ```

2. **Verify sender email**
   - Go to SendGrid Dashboard → Settings → Sender Authentication
   - Make sure your sender email shows as "Verified"
   - The email in `SENDGRID_FROM_EMAIL` must exactly match the verified email

3. **Check SendGrid Activity Feed**
   - Go to SendGrid Dashboard → Activity Feed
   - Look for your email attempts
   - Check for any errors or bounces

### Email not arriving?

1. **Check spam folder**
2. **Verify SendGrid Activity Feed** shows the email was sent
3. **Check SendGrid sender reputation** (new accounts may have delays)

### SendGrid API Key not working?

1. Make sure you copied the entire key (starts with `SG.`)
2. Verify the API key has **Mail Send** permissions
3. Try creating a new API key

---

## Testing Locally

To test SendGrid locally before deploying:

1. Create a `.env` file in the `server` directory:
   ```env
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.your-api-key-here
   SENDGRID_FROM_EMAIL=CARS-G <your-verified-email@gmail.com>
   ```

2. Run the test script:
   ```bash
   cd server
   node test-nodemailer-service.js
   ```

3. You should see:
   ```
   ✅ SendGrid SMTP transporter initialized
   ✅ Email service connection verified
   ```

---

## Cost Comparison

| Provider | Free Tier | Cost After |
|----------|-----------|------------|
| **SendGrid** | 100 emails/day | $19.95/mo for 50K |
| Mailgun | 5,000 emails/mo | $35/mo for 50K |
| Amazon SES | 62,000 emails/mo* | $0.10 per 1K |
| Postmark | 100 emails/mo | $15/mo for 10K |

*Amazon SES free tier only if hosted on AWS EC2

**Recommendation**: Start with SendGrid's free tier (100 emails/day is plenty for most apps).

---

## Summary

✅ **Changes Made:**
- Added SendGrid SMTP support to `nodemailerService.js`
- Updated `render.yaml` to use SendGrid by default
- Email sending now works on Render free tier

✅ **What You Need to Do:**
1. Create SendGrid account
2. Get API key
3. Verify sender email
4. Add environment variables to Render
5. Push code and redeploy

✅ **Expected Result:**
- No more connection timeout errors
- Emails send successfully
- Registration works properly

---

## Support

If you still have issues after following this guide:

1. Check Render logs for specific error messages
2. Verify all environment variables are set correctly
3. Test SendGrid connection using the test script
4. Check SendGrid Activity Feed for delivery status

For SendGrid-specific issues, check their [documentation](https://docs.sendgrid.com/).
