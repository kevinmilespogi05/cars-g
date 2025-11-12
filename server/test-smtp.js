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
    // Determine recipient(s): CLI args -> TEST_TO env -> SMTP_USER
    // Accept multiple CLI args, e.g. `node test-smtp.js alice@x.com bob@x.com`
    const cliArgs = process.argv.slice(2);
    const to = (cliArgs.length ? cliArgs.join(',') : null) || process.env.TEST_TO || process.env.SMTP_USER;
    if (!to) {
      console.error('No recipient specified. Provide recipient as CLI arg or set TEST_TO or SMTP_USER in .env');
      process.exitCode = 2;
      return;
    }

    const subject = 'CARS-G SMTP test';
    const html = `<p>This is a test message from CARS-G SMTP test script. If you received this, SMTP sending works.</p>`;

    console.log(`Sending test email to: ${to}`);
    const info = await sendMail({ to, subject, html });
    console.log('Send result:', info);
    console.log('SMTP test completed successfully');
  } catch (err) {
    console.error('SMTP test failed:', err);
    process.exitCode = 1;
  }
}

main();
