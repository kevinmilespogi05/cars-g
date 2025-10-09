const brevo = require('@getbrevo/brevo');

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

/**
 * Send notification email using Brevo
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message content
 * @returns {Promise} - Brevo API response
 */
const sendNotificationEmail = async (to, subject, message) => {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1976d2; margin: 0; font-size: 28px;">HIRAM Car Rental</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Account Status Update</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">
              ${message}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              Thank you for choosing HIRAM Car Rental System
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
    
    sendSmtpEmail.sender = {
      name: "Cars-G",
      email: process.env.EMAIL_USER || "sanpablocarsg16@gmail.com"
    };
    
    sendSmtpEmail.to = [{
      email: to,
      name: to.split('@')[0] // Use email prefix as name fallback
    }];

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Notification email sent successfully:', result);
    return result;
    
  } catch (error) {
    console.error('Error sending notification email:', error);
    throw error;
  }
};

module.exports = {
  sendNotificationEmail
};