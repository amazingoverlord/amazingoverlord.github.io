// =====================================================
// /api/send-email
//
// POST { to, subject, html } -> sends an email via Resend
//
// Requires these environment variables:
//   RESEND_API_KEY - your Resend API key (keep secret)
//   FROM_EMAIL     - verified sending address, e.g. noreply@yourdomain.com
// =====================================================

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    res.status(500).json({ error: 'Server is missing RESEND_API_KEY or FROM_EMAIL configuration.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { to, subject, html } = body || {};

  if (!to || !subject || !html) {
    res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: data.message || 'Failed to send email via Resend' });
      return;
    }

    res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unexpected error sending email' });
  }
};
