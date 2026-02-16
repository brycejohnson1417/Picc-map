import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGoogleClientId } from '../_google.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = getGoogleClientId();
  if (!clientId) {
    return res.status(200).json({ enabled: false });
  }

  return res.status(200).json({ enabled: true, clientId });
}
