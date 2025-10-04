import nodemailer from 'nodemailer';

/**
 * Gmail SMTP Email Service
 * Alternative to Brevo for more reliable email sending
 */
class GmailEmailService {
  constructor() {
    this.gmailUser = process.env.GMAIL_USER;
    this.gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    
    if (!this.gmailUser || !this.gmailAppPassword) {
      console.warn('⚠️  Gmail credentials not set - using fallback mode');
    }
    
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!this.gmailUser || !this.gmailAppPassword) {
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.gmailUser,
        pass: this.gmailAppPassword
      },
      // Production-optimized settings for hosting platforms
      pool: false,
      maxConnections: 1,
      maxMessages: 1,
      rateDelta: 5000,
      rateLimit: 1,
      // Extended timeouts for production hosting
      connectionTimeout: 30000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
      // Production-specific options
      secure: true,
      port: 587,
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      // Additional production settings
      debug: process.env.NODE_ENV === 'production',
      logger: process.env.NODE_ENV === 'production'
    });

    console.log('✅ Gmail SMTP transporter initialized');
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
      console.log(`📧 Attempting to send verification email to: ${email}`);

      // Check if Gmail is properly configured
      if (!this.transporter || !this.gmailUser || this.gmailUser === 'your_gmail_user_here') {
        const allowFallback = String(process.env.EMAIL_FALLBACK_MODE).toLowerCase() === 'true';
        console.log('📧 Gmail not configured. For development, verification code is:', code);
        console.log('📧 To enable Gmail sending, set GMAIL_USER and GMAIL_APP_PASSWORD environment variables');
        return allowFallback; // only succeed when explicitly in fallback mode
      }

      const mailOptions = {
        from: `"Cars-G" <${this.gmailUser}>`,
        to: email,
        subject: 'Verify Your Email - Cars-G',
        html: this.getVerificationEmailTemplate(code, username),
        text: this.getVerificationEmailText(code, username)
      };

      // Add timeout to prevent hanging requests (optimized for deployed systems)
      const isProduction = process.env.NODE_ENV === 'production';
      const timeoutMs = isProduction ? 15000 : 5000; // Longer timeout in production for Gmail SMTP
      
      const result = await Promise.race([
        this.transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gmail send timeout')), timeoutMs)
        )
      ]);
      
      console.log('✅ Verification email sent successfully to:', email);
      console.log('📧 Message ID:', result.messageId);
      return true;

    } catch (error) {
      console.error('❌ Error sending verification email:', error.message);
      
      const allowFallback = String(process.env.EMAIL_FALLBACK_MODE).toLowerCase() === 'true';
      
      // Handle timeout errors gracefully
      if (error.message === 'Gmail send timeout') {
        console.log('📧 Gmail request timed out');
        console.log('📧 For development, verification code is:', code);
      } else {
        console.log('📧 Gmail sending failed. For development, verification code is:', code);
      }
      
      return allowFallback; // false in prod, true only if fallback enabled
    }
  }

  /**
   * Get HTML email template for verification
   * @param {string} code - Verification code
   * @param {string} username - User's username
   * @returns {string} - HTML content
   */
  getVerificationEmailTemplate(code, username) {
    const baseUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const logoUrl = `${baseUrl || ''}/images/logo.jpg`;
    const primary = '#800000';
    const primaryDark = '#660000';
    const grayBg = '#F7F7F8';
    const textColor = '#1F2937';
    const subtle = '#6B7280';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: ${textColor}; max-width: 640px; margin: 0 auto; padding: 24px; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%); padding: 28px; border-radius: 16px; text-align: center; margin-bottom: 24px;">
          <div style="display:inline-flex; align-items:center; gap:12px;">
            <img src="${logoUrl}" alt="Cars-G" width="40" height="40" style="border-radius: 8px; object-fit: cover;" />
            <span style="color:#ffffff; font-size: 22px; font-weight: 800; letter-spacing:.3px;">Cars-G</span>
          </div>
          <h1 style="color: #ffffff; margin: 14px 0 0 0; font-size: 24px; font-weight: 700;">Verify your email</h1>
          <p style="color: #F3F4F6; margin: 6px 0 0 0; font-size: 14px;">Your community for car enthusiasts</p>
        </div>
        
        <div style="background: ${grayBg}; padding: 28px; border-radius: 16px; margin-bottom: 24px;">
          <h2 style="color: ${textColor}; margin: 0 0 8px 0; font-size: 18px;">Hi ${username}!</h2>
          <p style="font-size: 14px; margin: 0 0 18px 0; color: ${subtle};">
            Thanks for joining Cars-G. Please verify your email to complete your registration.
          </p>

          <div style="background: #ffffff; border: 1px dashed ${primary}; border-radius: 12px; padding: 24px; text-align: center; margin: 18px 0;">
            <p style="margin: 0 0 6px 0; font-size: 12px; color: ${subtle};">Your verification code</p>
            <div style="font-size: 36px; font-weight: 800; color: ${primary}; letter-spacing: 6px; font-family: 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace;">
              ${code}
            </div>
          </div>

          <p style="font-size: 12px; color: ${subtle}; margin: 0;">This code expires in 10 minutes.</p>
        </div>
        
        <div style="text-align: center; padding: 16px; background: ${grayBg}; border-radius: 12px;">
          <p style="margin: 0; font-size: 12px; color: ${subtle};">
            If you didn't create an account with Cars-G, you can safely ignore this email.
          </p>
        </div>
        
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="margin-top: 24px;">
          <tr>
            <td align="center" style="font-size: 12px; color: ${subtle};">
              © ${new Date().getFullYear()} Cars-G. All rights reserved.
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Get plain text email template for verification
   * @param {string} code - Verification code
   * @param {string} username - User's username
   * @returns {string} - Text content
   */
  getVerificationEmailText(code, username) {
    return `
Welcome to Cars-G!

Hi ${username}!

Thank you for registering with Cars-G! To complete your registration and start exploring our community, please verify your email address using the code below:

Your verification code is: ${code}

This code will expire in 10 minutes for security reasons.

If you didn't create an account with Cars-G, you can safely ignore this email.

© 2024 Cars-G. All rights reserved.
    `.trim();
  }

  /**
   * Test email service configuration
   * @returns {Promise<boolean>} - Configuration status
   */
  async testConfiguration() {
    try {
      if (!this.gmailUser || !this.gmailAppPassword) {
        console.log('❌ Gmail credentials not configured');
        console.log('   Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables');
        return false;
      }

      if (!this.transporter) {
        console.log('❌ Gmail transporter not initialized');
        return false;
      }

      // Test the connection with extended timeout for production
      const isProduction = process.env.NODE_ENV === 'production';
      const testTimeout = isProduction ? 20000 : 10000;
      
      console.log(`🔍 Testing Gmail SMTP connection (timeout: ${testTimeout}ms)...`);
      
      const verifyPromise = this.transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gmail connection test timeout')), testTimeout)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      
      console.log('✅ Gmail email service configured and ready');
      console.log(`   User: ${this.gmailUser}`);
      console.log(`   Environment: ${isProduction ? 'Production' : 'Development'}`);
      return true;

    } catch (error) {
      console.error('❌ Error testing Gmail configuration:', error.message);
      if (error.message.includes('timeout')) {
        console.log('⚠️  Gmail connection timed out - this is common in production environments');
        console.log('💡 The service will still attempt to send emails with fallback mode');
      }
      return false;
    }
  }
}

export default GmailEmailService;
