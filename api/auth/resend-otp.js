// resend-otp.js removed (OTP/SMTP flow). Placeholder file.
// This endpoint has been neutralized to remove Brevo/SMTP and OTP functionality.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  return res.status(410).json({ success: false, error: 'Email OTP/resend endpoint has been removed' });
}
