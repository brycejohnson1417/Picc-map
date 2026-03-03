import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSourceStatus } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sourceId = String(req.query.sourceId || '');
  if (!sourceId) {
    return res.status(400).json({ error: 'Missing sourceId' });
  }

  const status = await getSourceStatus(sourceId);
  if (!status) {
    return res.status(404).json({ error: 'Source not found' });
  }

  return res.status(200).json(status);
}
