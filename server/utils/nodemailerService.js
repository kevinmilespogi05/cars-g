import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Gmail configuration
const GMAIL_USER = process.env.GMAIL_USER || 'kevinmilesjulhusin99@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'ocre hcty mbzq oxrw';
const EMAIL_SENDER = process.env.EMAIL_SENDER || 'CARS-G <sanpablocarsg@gmail.com>';

// Create transporter with production-ready configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS for production compatibility
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  },
  // Additional options for production reliability
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates in development
  },
  // Connection timeout settings
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 60000      // 60 seconds
});

// Note: OTP generation and verification email functions removed
// as Gmail verification is no longer used for registration

// Test email configuration
export async function testEmailConfiguration() {
  try {
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email, resetToken) {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4361ee;
            margin-bottom: 10px;
          }
          .button {
            display: inline-block;
            background-color: #4361ee;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚗 Cars-G</div>
            <h2>Password Reset Request</h2>
          </div>
          
          <p>Hello!</p>
          
          <p>We received a request to reset your password for your Cars-G account.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          
          <p>This link will expire in 1 hour for security reasons.</p>
          
          <p>If you didn't request a password reset, please ignore this email.</p>
          
          <p>Best regards,<br>The Cars-G Team</p>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 Cars-G. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: EMAIL_SENDER,
      to: email,
      subject: 'Password Reset Request - Cars-G',
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', {
      to: email,
      messageId: result.messageId
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
}
