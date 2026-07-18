// =====================================================
// /api/admin-login
//
// POST   { password } -> sets a signed, httpOnly session cookie valid 24h
// GET    -> 200 if the current cookie is a valid, unexpired session
// DELETE -> clears the cookie (logout)
//
// Requires these environment variables on your host (Vercel/Netlify):
//   ADMIN_PASSWORD        - the admin login password
//   ADMIN_SESSION_SECRET  - a long random string used to sign the session cookie
// =====================================================

const crypto = require('crypto');

const COOKIE_NAME = 'rsvp_admin_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function makeSessionToken(secret) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = `${expiresAt}`;
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

function verifySessionToken(token, secret) {
  if (!token || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  const expected = sign(payload, secret);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

  const expiresAt = parseInt(payload, 10);
  return Date.now() < expiresAt;
}

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf('=');
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      })
  );
}

module.exports = async (req, res) => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!secret || !adminPassword) {
    res.status(500).json({ error: 'Server is missing ADMIN_PASSWORD or ADMIN_SESSION_SECRET configuration.' });
    return;
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { password } = body || {};

    const providedBuf = Buffer.from(String(password || ''));
    const actualBuf = Buffer.from(adminPassword);

    const matches =
      providedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(providedBuf, actualBuf);

    if (!matches) {
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }

    const token = makeSessionToken(secret);
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION_MS / 1000}`
    );
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[COOKIE_NAME];
    if (verifySessionToken(token, secret)) {
      res.status(200).json({ ok: true });
    } else {
      res.status(401).json({ ok: false });
    }
    return;
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
