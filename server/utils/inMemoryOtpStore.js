// Simple in-memory OTP store. Not durable across restarts. Suitable for demo/dev flows.
// For production use, replace with persistent storage (Redis, DB table).

const store = new Map(); // key: email (lowercase) -> { hash, expires: ISOString, attempts, sentAt }

export function setOtpForEmail(email, hash, expiresIso, sentAtIso) {
  const key = String(email).toLowerCase();
  store.set(key, { hash, expires: expiresIso, attempts: 0, sentAt: sentAtIso });
}

export function getOtpEntry(email) {
  const key = String(email).toLowerCase();
  return store.get(key) || null;
}

export function incrementAttempts(email) {
  const key = String(email).toLowerCase();
  const cur = store.get(key);
  if (!cur) return 0;
  cur.attempts = (cur.attempts || 0) + 1;
  store.set(key, cur);
  return cur.attempts;
}

export function clearOtp(email) {
  const key = String(email).toLowerCase();
  store.delete(key);
}

export default { setOtpForEmail, getOtpEntry, incrementAttempts, clearOtp };
