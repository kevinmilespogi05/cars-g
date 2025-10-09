import dotenv from 'dotenv';

dotenv.config();

// Simple email service that logs to console (for development/testing)
// In production, this could be replaced with any email service
export const sendVerificationEmail = async (toEmail, otp, type = 'registration') => {
  try {
    let subject, htmlContent;
    
    switch (type) {
      case 'registration':
        subject = 'Cars-G Email Verification';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1976d2; margin: 0; font-size: 28px;">Cars-G</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Email Verification</p>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #333; margin-top: 0;">Welcome to Cars-G!</h2>
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Thank you for registering with Cars-G. To complete your registration, please verify your email address using the code below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <div style="display: inline-block; background-color: #1976d2; color: white; padding: 15px 30px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
                    ${otp}
                  </div>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
                  This verification code will expire in 10 minutes.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #666; font-size: 14px; margin: 0;">
                  If you didn't create an account with Cars-G, please ignore this email.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This is an automated message, please do not reply to this email.
              </p>
            </div>
          </div>
        `;
        break;
        
      default:
        subject = 'Cars-G Verification Code';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>Cars-G Verification</h1>
            <p>Your verification code is: <strong>${otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `;
    }

    // For now, just log the email details
    // In production, you would integrate with an email service
    console.log('📧 EMAIL SENT (Development Mode):');
    console.log('To:', toEmail);
    console.log('Subject:', subject);
    console.log('OTP Code:', otp);
    console.log('Type:', type);
    console.log('---');
    
    // Simulate successful email sending
    return true;
    
  } catch (error) {
    console.error(`Error in simple email service:`, error);
    return false;
  }
};

// Test email function
export const testEmailConnection = async () => {
  try {
    console.log('✅ Simple email service ready (development mode)');
    return true;
  } catch (error) {
    console.error('❌ Simple email service failed:', error);
    return false;
  }
};

export default sendVerificationEmail;
