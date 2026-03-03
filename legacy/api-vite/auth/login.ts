import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authConfigured, createSession, passwordAuthConfigured, validatePassword } from '../_auth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!authConfigured()) {
    return res.status(500).json({ error: 'Auth is not configured. Set APP_AUTH_SECRET.' });
  }

  if (!passwordAuthConfigured()) {
    return res.status(400).json({ error: 'Password sign-in is disabled for this deployment.' });
  }

  const password = req.body?.password;
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (!validatePassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  createSession(res);
  return res.status(200).json({ ok: true });
}
