import nodemailer from 'nodemailer';

// SMTP helper using environment variables. Do NOT commit credentials to git.
// Required env vars (set these in your local .env):
// SMTP_HOST, SMTP_PORT, SMTP_SECURE (true|false), SMTP_USER, SMTP_PASS, SMTP_FROM

let transporter;
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';

  const info = await t.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });

  return info;
}

export default { sendMail };
