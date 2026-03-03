import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSession } from '../_auth.js';
import { getGoogleAllowedDomain, verifyGoogleIdToken } from '../_google.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const idToken = req.body?.credential || req.body?.idToken;
  if (typeof idToken !== 'string' || !idToken) {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  const payload = await verifyGoogleIdToken(idToken);
  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ error: 'Unable to verify Google sign-in' });
  }

  const allowedDomain = getGoogleAllowedDomain();
  if (allowedDomain) {
    const normalizedDomain = allowedDomain.trim().toLowerCase();
    const hostDomain = payload.hd?.toLowerCase();
    const emailDomain = payload.email.split('@')[1]?.toLowerCase();

    if (hostDomain !== normalizedDomain && emailDomain !== normalizedDomain) {
      return res.status(403).json({ error: `Access is restricted to ${normalizedDomain}` });
    }
  }

  createSession(res);
  return res.status(200).json({
    ok: true,
    user: {
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || null,
    },
  });
}
