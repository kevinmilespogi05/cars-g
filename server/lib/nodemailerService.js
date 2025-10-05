import nodemailer from 'nodemailer';

/**
 * Unified Nodemailer Email Service
 * Supports multiple email providers (Gmail, Outlook, custom SMTP)
 */
class NodemailerEmailService {
  constructor() {
    this.transporter = null;
    this.provider = process.env.EMAIL_PROVIDER || 'gmail';
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      switch (this.provider.toLowerCase()) {
        case 'gmail':
          this.setupGmailTransporter();
          break;
        case 'outlook':
        case 'hotmail':
          this.setupOutlookTransporter();
          break;
        case 'custom':
          this.setupCustomTransporter();
          break;
        default:
          console.warn(`⚠️  Unknown email provider: ${this.provider}, falling back to Gmail`);
          this.setupGmailTransporter();
      }
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
    }
  }

  setupGmailTransporter() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    
    if (!gmailUser || !gmailAppPassword) {
      console.warn('⚠️  Gmail credentials not set - email sending will not work');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });

    console.log('✅ Gmail SMTP transporter initialized');
  }

  setupOutlookTransporter() {
    const outlookUser = process.env.OUTLOOK_USER;
    const outlookPassword = process.env.OUTLOOK_PASSWORD;
    
    if (!outlookUser || !outlookPassword) {
      console.warn('⚠️  Outlook credentials not set - email sending will not work');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user: outlookUser,
        pass: outlookPassword
      }
    });

    console.log('✅ Outlook SMTP transporter initialized');
  }

  setupCustomTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    
    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.warn('⚠️  Custom SMTP credentials not set - email sending will not work');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });

    console.log(`✅ Custom SMTP transporter initialized (${smtpHost}:${smtpPort})`);
  }

  /**
   * Send verification email with code
   * @param {string} email - Recipient email
   * @param {string} code - Verification code
   * @param {string} username - User's username
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationEmail(email, code, username = 'User') {
    try {
      if (!this.transporter) {
        console.error('❌ Email transporter not initialized');
        return false;
      }

      const senderEmail = this.getSenderEmail();
      const mailOptions = {
        from: senderEmail,
        to: email,
        subject: 'Cars-G Email Verification',
        html: this.getVerificationEmailHTML(code, username, email),
        text: this.getVerificationEmailText(code, username, email)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent successfully to:', email);
      console.log('📧 Message ID:', info.messageId);
      return true;

    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      
      // Handle specific error cases
      if (error.code === 'EAUTH') {
        console.error('❌ Authentication failed - check email credentials');
      } else if (error.code === 'ECONNECTION') {
        console.error('❌ Connection failed - check SMTP settings');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('❌ Connection timeout - check network connectivity');
      }
      
      return false;
    }
  }

  /**
   * Get sender email based on provider
   * @returns {string} - Sender email address
   */
  getSenderEmail() {
    const customSender = process.env.EMAIL_SENDER;
    if (customSender) {
      return customSender;
    }

    switch (this.provider.toLowerCase()) {
      case 'gmail':
        return process.env.GMAIL_USER || 'Cars-G <noreply@cars-g.com>';
      case 'outlook':
      case 'hotmail':
        return process.env.OUTLOOK_USER || 'Cars-G <noreply@cars-g.com>';
      case 'custom':
        return process.env.SMTP_USER || 'Cars-G <noreply@cars-g.com>';
      default:
        return 'Cars-G <noreply@cars-g.com>';
    }
  }

  /**
   * Get HTML email template for verification
   * @param {string} code - Verification code
   * @param {string} username - User's username
   * @param {string} email - User's email address
   * @returns {string} - HTML content
   */
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
          .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .code-container {
            background: #f8fafc;
            border: 2px dashed #cbd5e1;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .verification-code {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
          }
          .instructions {
            background: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
          .button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 0;
          }
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
            <a href="https://cars-g.vercel.app/verify-email?code=${code}&email=${encodeURIComponent(email)}" class="button">
              Verify Email Address
            </a>
          </div>
          
          <div class="footer">
            <p>This email was sent by Cars-G. If you have any questions, please contact our support team.</p>
            <p>© 2024 Cars-G. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get plain text email template for verification
   * @param {string} code - Verification code
   * @param {string} username - User's username
   * @param {string} email - User's email address
   * @returns {string} - Plain text content
   */
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

© 2024 Cars-G. All rights reserved.
    `.trim();
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>} - Success status
   */
  async testConnection() {
    try {
      if (!this.transporter) {
        console.error('❌ Email transporter not initialized');
        return false;
      }

      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }

  /**
   * Send test email
   * @param {string} testEmail - Email to send test to
   * @returns {Promise<boolean>} - Success status
   */
  async sendTestEmail(testEmail) {
    try {
      if (!this.transporter) {
        console.error('❌ Email transporter not initialized');
        return false;
      }

      const senderEmail = this.getSenderEmail();
      const mailOptions = {
        from: senderEmail,
        to: testEmail,
        subject: 'Cars-G Email Service Test',
        html: `
          <h2>Email Service Test</h2>
          <p>This is a test email from Cars-G email service.</p>
          <p>If you received this email, the email service is working correctly!</p>
          <p><strong>Provider:</strong> ${this.provider}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `,
        text: `
Email Service Test

This is a test email from Cars-G email service.

If you received this email, the email service is working correctly!

Provider: ${this.provider}
Timestamp: ${new Date().toISOString()}
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully to:', testEmail);
      console.log('📧 Message ID:', info.messageId);
      return true;

    } catch (error) {
      console.error('❌ Error sending test email:', error);
      return false;
    }
  }
}

export default NodemailerEmailService;
