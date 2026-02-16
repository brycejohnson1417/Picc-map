import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authConfigured, requireAuth } from '../_auth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!authConfigured()) {
    return res.status(500).json({ error: 'Auth is not configured. Set APP_AUTH_SECRET.' });
  }

  const ok = requireAuth(req, res);
  if (!ok) return;

  return res.status(200).json({ ok: true });
}
