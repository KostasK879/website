// Vercel serverless function: receives the contact form and emails it via Resend.
// Requires env var RESEND_API_KEY (and the sending domain verified in Resend).
// Optional: CONTACT_TO (default hello@nodusai.io), CONTACT_FROM (default "NODUS AI <noreply@nodusai.io>").

const hits = new Map(); // best-effort, per-instance rate limit (resets on cold start)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers.origin;
  if (origin && !/^https:\/\/(www\.)?nodusai\.io$/.test(origin) && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) return res.status(429).json({ error: 'Too many requests' });
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // Honeypot: bots fill the hidden field. Pretend success, send nothing.
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const company = clean(body.company, 160);
  const message = clean(body.message, 5000);
  if (!name || !message || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    return res.status(400).json({ error: 'Please fill in name, a valid email and a message.' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'Email service not configured' });

  const to = process.env.CONTACT_TO || 'hello@nodusai.io';
  const from = process.env.CONTACT_FROM || 'NODUS AI <noreply@nodusai.io>';
  const subject = `New enquiry from ${name.replace(/[\r\n]+/g, ' ')}${company ? ` (${company.replace(/[\r\n]+/g, ' ')})` : ''}`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], reply_to: email, subject,
        text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || '-'}\n\n${message}`,
        html: `<p><b>Name:</b> ${esc(name)}<br><b>Email:</b> ${esc(email)}<br><b>Company:</b> ${esc(company || '-')}</p><p>${esc(message).replace(/\n/g, '<br>')}</p>`,
      }),
    });
    if (!r.ok) {
      console.error('Resend error', r.status, await r.text());
      return res.status(502).json({ error: 'Could not send message' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Resend fetch failed', e);
    return res.status(502).json({ error: 'Could not send message' });
  }
}
