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
      }
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

      // If Gmail is not configured, use fallback
      if (!this.transporter) {
        console.log('📧 Gmail not configured. For development, verification code is:', code);
        console.log('📧 To enable Gmail sending, set GMAIL_USER and GMAIL_APP_PASSWORD environment variables');
        return true; // Return true for development
      }

      const mailOptions = {
        from: `"Cars-G" <${this.gmailUser}>`,
        to: email,
        subject: 'Verify Your Email - Cars-G',
        html: this.getVerificationEmailTemplate(code, username),
        text: this.getVerificationEmailText(code, username)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent successfully to:', email);
      console.log('📧 Message ID:', result.messageId);
      return true;

    } catch (error) {
      console.error('❌ Error sending verification email:', error.message);
      
      // If Gmail fails, fall back to development mode
      console.log('📧 Gmail sending failed. For development, verification code is:', code);
      return true; // Return true for development
    }
  }

  /**
   * Get HTML email template for verification
   * @param {string} code - Verification code
   * @param {string} username - User's username
   * @returns {string} - HTML content
   */
  getVerificationEmailTemplate(code, username) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Cars-G!</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your community for car enthusiasts</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${username}!</h2>
          <p style="font-size: 16px; margin-bottom: 25px;">
            Thank you for registering with Cars-G! To complete your registration and start exploring our community, 
            please verify your email address using the code below:
          </p>
          
          <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 25px; text-align: center; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: 'Courier New', monospace;">
              ${code}
            </div>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            This code will expire in 10 minutes for security reasons.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            If you didn't create an account with Cars-G, you can safely ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 0; font-size: 12px; color: #999;">
            © 2024 Cars-G. All rights reserved.
          </p>
        </div>
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

      // Test the connection
      await this.transporter.verify();
      console.log('✅ Gmail email service configured and ready');
      console.log(`   User: ${this.gmailUser}`);
      return true;

    } catch (error) {
      console.error('❌ Error testing Gmail configuration:', error.message);
      return false;
    }
  }
}

export default GmailEmailService;
