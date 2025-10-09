import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';
import dotenv from 'dotenv';

dotenv.config();

async function testBrevoEmail() {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.EMAIL_USER;
    const senderName = process.env.EMAIL_SENDERNAME || 'Cars-G';

    console.log('API Key:', apiKey ? 'Present' : 'Missing');
    console.log('Sender Email:', senderEmail);
    console.log('Sender Name:', senderName);

    if (!apiKey) {
      console.error('BREVO_API_KEY is missing');
      return;
    }

    let emailAPI = new TransactionalEmailsApi();
    emailAPI.authentications.apiKey.apiKey = apiKey;

    let message = new SendSmtpEmail();
    message.subject = 'Test Email from Cars-G';
    message.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Test Email</h1>
        <p>This is a test email from Cars-G to verify Brevo integration.</p>
      </div>
    `;
    message.sender = { email: senderEmail, name: senderName };
    message.to = [{ email: 'test@example.com' }];

    console.log('Sending test email...');
    const result = await emailAPI.sendTransacEmail(message);
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Error sending email:', error);
    console.error('Error details:', error.response?.data || error.message);
  }
}

testBrevoEmail();
