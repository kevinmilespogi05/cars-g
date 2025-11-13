import sgMail from '@sendgrid/mail';

// SendGrid helper using environment variables. Do NOT commit credentials to git.
// Required env vars (set these in your local .env):
//   SENDGRID_API_KEY (required)
//   SENDGRID_FROM_EMAIL (recommended)
// Legacy SMTP_* variables are still read as fallbacks for the "from" address.

let isConfigured = false;

function ensureClientConfigured() {
  if (isConfigured) return;

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('Missing SENDGRID_API_KEY environment variable.');
  }

  sgMail.setApiKey(apiKey);

  const residency = process.env.SENDGRID_DATA_RESIDENCY;
  if (residency && residency.toLowerCase() === 'eu') {
    if (typeof sgMail.setDataResidency === 'function') {
      sgMail.setDataResidency('eu');
    } else {
      console.warn(
        'SENDGRID_DATA_RESIDENCY=eu requested, but current @sendgrid/mail version does not expose setDataResidency. Consider upgrading the SDK.'
      );
    }
  }

  isConfigured = true;
}

export async function sendMail({ to, subject, html, text }) {
  ensureClientConfigured();

  const from =
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'no-reply@example.com';

  try {
    const [response] = await sgMail.send({
      to,
      from,
      subject,
      html,
      text,
    });

    return response;
  } catch (error) {
    if (error?.response?.body) {
      console.error('SendGrid error response:', error.response.body);
    }
    throw error;
  }
}

export async function testEmailConfiguration() {
  try {
    ensureClientConfigured();

    const from =
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER;

    if (!from) {
      throw new Error('No from address configured. Set SENDGRID_FROM_EMAIL or SMTP_FROM.');
    }

    return true;
  } catch (error) {
    console.error('SendGrid configuration test failed:', error);
    return false;
  }
}

export default { sendMail, testEmailConfiguration };
