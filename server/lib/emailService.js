import fetch from 'node-fetch';

/**
 * Brevo Email Service
 * Handles sending verification emails through Brevo API
 */
class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.senderEmail = process.env.BREVO_SENDER_EMAIL;
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    
    if (!this.apiKey) {
      console.warn('⚠️  BREVO_API_KEY not set - email verification will not work');
    }
    
    if (!this.senderEmail) {
      console.warn('⚠️  BREVO_SENDER_EMAIL not set - using default sender');
      this.senderEmail = 'Cars-G <noreply@cars-g.com>';
    }
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
      const allowFallback = String(process.env.EMAIL_FALLBACK_MODE).toLowerCase() === 'true';
      
      // Check if API key is properly configured
      if (!this.apiKey || this.apiKey === 'your_brevo_api_key_here') {
        console.log('📧 Brevo API key not configured. For development, verification code is:', code);
        console.log('📧 Please set BREVO_API_KEY environment variable to enable email sending');
        return allowFallback; // false unless fallback
      }

      console.log(`📧 Attempting to send verification email to: ${email}`);

      const emailData = {
        sender: {
          name: 'Cars-G',
          email: this.senderEmail.includes('<') 
            ? this.senderEmail.split('<')[1].split('>')[0].trim()
            : this.senderEmail
        },
        to: [
          {
            email: email,
            name: username
          }
        ],
        subject: 'Verify Your Email - Cars-G',
        htmlContent: this.getVerificationEmailTemplate(code, username),
        textContent: this.getVerificationEmailText(code, username)
      };

      // Add timeout to prevent hanging requests (optimized for deployed systems)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced to 8 seconds for faster fallback

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify(emailData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Brevo email send failed:', response.status, errorData);
        
        // Handle specific error cases
        if (errorData.code === 'permission_denied' && errorData.message?.includes('SMTP account is not yet activated')) {
          console.log('📧 SMTP account not activated. For activation, contact contact@brevo.com');
          console.log('📧 For development, verification code is:', code);
          return allowFallback; // false in prod, true only if fallback enabled
        }

        // Handle invalid API key
        if (errorData.code === 'unauthorized' || response.status === 401) {
          console.log('📧 Invalid Brevo API key');
          console.log('📧 For development, verification code is:', code);
          return allowFallback; // false in prod, true only if fallback enabled
        }

        // Handle rate limiting with single retry
        if (response.status === 429) {
          console.log('📧 Rate limited, waiting 2 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Retry once with shorter timeout
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 6000); // 6 second timeout for retry
          
          const retryResponse = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': this.apiKey
            },
            body: JSON.stringify(emailData),
            signal: retryController.signal
          });

          clearTimeout(retryTimeoutId);

          if (retryResponse.ok) {
            console.log('✅ Verification email sent successfully on retry to:', email);
            return true;
          } else {
            console.log('📧 Retry failed. For development, verification code is:', code);
            return allowFallback; // false in prod, true only if fallback enabled
          }
        }

        // For other errors, log and fallback to development mode
        console.log('📧 Email sending failed. For development, verification code is:', code);
        return allowFallback; // false in prod, true only if fallback enabled
      }

      const result = await response.json();
      console.log('✅ Verification email sent successfully to:', email);
      return true;

    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      
      const allowFallback = String(process.env.EMAIL_FALLBACK_MODE).toLowerCase() === 'true';
      
      // Handle timeout errors gracefully
      if (error.name === 'AbortError') {
        console.log('📧 Email request timed out');
        console.log('📧 For development, verification code is:', code);
        return allowFallback;
      }
      
      // For any other error, fallback to development mode
      console.log('📧 Email service error:', error.message);
      console.log('📧 For development, verification code is:', code);
      return allowFallback;
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
      if (!this.apiKey) {
        console.log('❌ Brevo API key not configured');
        return false;
      }

      if (!this.senderEmail) {
        console.log('❌ Brevo sender email not configured');
        return false;
      }

      console.log('✅ Brevo email service configured');
      console.log(`   API Key: ${this.apiKey.substring(0, 10)}...`);
      console.log(`   Sender: ${this.senderEmail}`);
      return true;

    } catch (error) {
      console.error('❌ Error testing email configuration:', error);
      return false;
    }
  }
}

export default EmailService;
