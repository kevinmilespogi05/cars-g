import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { sendMail } from './utils/smtpService.js';

// Load .env from the server folder (resolve relative to this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  try {
    // Determine recipient(s): CLI args -> TEST_TO env -> SENDGRID_FROM_EMAIL/SMTP_USER
    // Accept multiple CLI args, e.g. `node test-smtp.js alice@x.com bob@x.com`
    const cliArgs = process.argv.slice(2);
    const to =
      (cliArgs.length ? cliArgs.join(',') : null) ||
      process.env.TEST_TO ||
      process.env.SENDGRID_TEST_TO ||
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.SMTP_USER;
    if (!to) {
      console.error('No recipient specified. Provide recipient as CLI arg or set TEST_TO, SENDGRID_FROM_EMAIL, or SMTP_USER in .env');
      process.exitCode = 2;
      return;
    }

    const subject = 'BANTAY SP email test';
    const html = `<p>This is a test message from the BANTAY SP email test script. If you received this, SendGrid sending works.</p>`;

    console.log(`Sending test email to: ${to}`);
    const info = await sendMail({ to, subject, html });
    if (info) {
      console.log('Send result:', {
        statusCode: info.statusCode,
        headers: info.headers,
      });
    } else {
      console.log('Send result: no response received');
    }
    console.log('Email test completed successfully');
  } catch (err) {
    console.error('Email test failed:', err);
    process.exitCode = 1;
  }
}

main();
