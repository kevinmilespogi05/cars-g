import fetch from 'node-fetch';

/**
 * Brevo (Sendinblue) Email Service
 * Sends transactional emails using Brevo v3 API
 */
class BrevoEmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    // Support multiple env formats: "Name <email>", or separate EMAIL_USER + EMAIL_SENDERNAME
    const envSender = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_SENDER || '').trim();
    const senderEmailFromUser = (process.env.EMAIL_USER || '').trim();
    const senderNameFromEnv = (process.env.EMAIL_SENDERNAME || '').trim();

    if (envSender) {
      this.sender = envSender;
    } else if (senderEmailFromUser) {
      const safeName = senderNameFromEnv || 'Cars-G';
      this.sender = `${safeName} <${senderEmailFromUser}>`;
    } else {
      this.sender = 'Cars-G <sanpablocarsg@gmail.com>';
    }
  }

  /**
   * Send verification email with code via Brevo
   * @param {string} email - Recipient email
   * @param {string} code - Verification code
   * @param {string} username - User's username
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationEmail(email, code, username = 'User') {
    try {
      if (!this.apiKey) {
        console.error('❌ BREVO_API_KEY not set');
        return false;
      }

      const { senderEmail, senderName } = this.parseSender(this.sender);

      const payload = {
        sender: { email: senderEmail, name: senderName },
        to: [{ email, name: username }],
        subject: 'Cars-G Email Verification',
        htmlContent: this.getVerificationEmailHTML(code, username, email),
        textContent: this.getVerificationEmailText(code, username, email)
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      let resp;
      try {
        resp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.error('❌ Brevo send failed:', resp.status, text);
        return false;
      }

      console.log('✅ Verification email sent via Brevo to:', email);
      return true;
    } catch (error) {
      console.error('❌ Error sending Brevo verification email:', error?.message || error);
      return false;
    }
  }

  /**
   * Generic email sender via Brevo v3 API
   * @param {{to:string, subject:string, htmlContent?:string, textContent?:string, toName?:string}} opts
   * @returns {Promise<boolean>}
   */
  async sendEmail(opts = {}) {
    try {
      if (!this.apiKey) {
        console.error('❌ BREVO_API_KEY not set');
        return false;
      }

      const { to, subject, htmlContent, textContent, toName } = opts;
      if (!to || !subject || (!htmlContent && !textContent)) {
        console.error('❌ sendEmail missing required fields');
        return false;
      }

      const { senderEmail, senderName } = this.parseSender(this.sender);
      const payload = {
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to, name: toName || to.split('@')[0] }],
        subject,
        ...(htmlContent ? { htmlContent } : {}),
        ...(textContent ? { textContent } : {})
      };

      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.error('❌ Brevo sendEmail failed:', resp.status, text);
        return false;
      }
      return true;
    } catch (error) {
      console.error('❌ Error in sendEmail:', error?.message || error);
      return false;
    }
  }

  /**
   * Convenience to send OTP email
   * @param {string} email
   * @param {string} otp
   * @returns {Promise<boolean>}
   */
  async sendOtpEmail(email, otp) {
    const subject = 'Your Cars-G OTP Code';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color:#2563eb; margin-top:0">Cars-G</h2>
          <p>Your OTP code is:</p>
          <div style="font-size: 28px; font-weight: bold; margin: 16px 0; letter-spacing: 4px;">${otp}</div>
          <p>This code will expire in 10 minutes.</p>
        </div>
        <p style="color:#999; font-size:12px; text-align:center;">If you didn't request this, you can ignore this email.</p>
      </div>
    `;
    const textContent = `Your Cars-G OTP code is: ${otp}. It expires in 10 minutes.`;
    return this.sendEmail({ to: email, subject, htmlContent, textContent });
  }

  parseSender(sender) {
    const match = sender.match(/^(.*)<\s*(.*)\s*>$/);
    if (match) {
      return { senderName: match[1].trim(), senderEmail: match[2].trim() };
    }
    return { senderName: sender, senderEmail: sender };
  }

  getVerificationEmailHTML(code, username, email) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Cars-G</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
          .code-container { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .verification-code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px; font-family: 'Courier New', monospace; }
          .instructions { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚗 Cars-G</div>
            <h1>Email Verification Required</h1>
          </div>
          <p>Hello <strong>${username}</strong>,</p>
          <p>Thank you for registering with Cars-G! To complete your account setup, please verify your email address using the code below:</p>
          <div class="code-container">
            <div class="verification-code">${code}</div>
          </div>
          <div class="instructions">
            <strong>Instructions:</strong>
            <ul>
              <li>Enter this code in the verification form</li>
              <li>The code will expire in 10 minutes</li>
              <li>If you didn't request this verification, please ignore this email</li>
            </ul>
          </div>
          <p>If you're having trouble with the code, you can also click the button below to verify your email:</p>
          <div style="text-align: center;">
            <a href="https://cars-g.vercel.app/verify-email?code=${code}&email=${encodeURIComponent(email)}" class="button">Verify Email Address</a>
          </div>
          <div class="footer">
            <p>This email was sent by Cars-G. If you have any questions, please contact our support team.</p>
            <p>© 2025 Cars-G. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getVerificationEmailText(code, username, email) {
    return `
Cars-G Email Verification

Hello ${username},

Thank you for registering with Cars-G! To complete your account setup, please verify your email address using the code below:

VERIFICATION CODE: ${code}

Instructions:
- Enter this code in the verification form
- The code will expire in 10 minutes
- If you didn't request this verification, please ignore this email

If you're having trouble with the code, you can also visit:
https://cars-g.vercel.app/verify-email?code=${code}&email=${encodeURIComponent(email)}

This email was sent by Cars-G. If you have any questions, please contact our support team.

© 2025 Cars-G. All rights reserved.
    `.trim();
  }

  /**
   * Create a Brevo email campaign (classic)
   * Mirrors SDK example using REST to avoid extra dependency
   * @param {object} options
   * @param {string} options.name
   * @param {string} options.subject
   * @param {{name:string,email:string}} [options.sender]
   * @param {string} options.htmlContent
   * @param {number[]} options.listIds
   * @param {string} [options.scheduledAt] - 'YYYY-MM-DD HH:mm:ss' UTC
   * @returns {Promise<{id:number}|{error:string}>}
   */
  async createEmailCampaign(options = {}) {
    if (!this.apiKey) {
      return { error: 'BREVO_API_KEY not set' };
    }

    const {
      name,
      subject,
      sender,
      htmlContent,
      listIds,
      scheduledAt
    } = options;

    if (!name || !subject || !htmlContent || !Array.isArray(listIds) || listIds.length === 0) {
      return { error: 'Missing required fields: name, subject, htmlContent, listIds[]' };
    }

    const { senderEmail, senderName } = this.parseSender(this.sender);
    const payload = {
      name,
      subject,
      sender: sender || { name: senderName, email: senderEmail },
      type: 'classic',
      htmlContent,
      recipients: { listIds },
      ...(scheduledAt ? { scheduledAt } : {})
    };

    try {
      const resp = await fetch('https://api.brevo.com/v3/emailCampaigns', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.error('❌ Brevo create campaign failed:', resp.status, text);
        return { error: `HTTP ${resp.status}: ${text}` };
      }

      const data = await resp.json();
      // Brevo returns { id: number }
      return data;
    } catch (error) {
      console.error('❌ Error creating Brevo campaign:', error?.message || error);
      return { error: error?.message || 'Unknown error' };
    }
  }
}

export default BrevoEmailService;


