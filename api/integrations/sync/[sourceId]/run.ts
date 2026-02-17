import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSource } from '../../lib/db';
import { runSourceSync } from '../../lib/syncRunner';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sourceId = String(req.query.sourceId || '');
  if (!sourceId) {
    return res.status(400).json({ error: 'Missing sourceId' });
  }

  const source = await getSource(sourceId);
  if (!source) {
    return res.status(404).json({ error: 'Source not found' });
  }

  const body = req.body || {};
  try {
    await runSourceSync(sourceId, {
      force: Boolean(body.force),
      createdBy: body.createdBy || 'api'
    });
    return res.status(200).json({ sourceId, message: `Sync started for ${source.name}` });
  } catch (error) {
    return res.status(409).json({
      sourceId,
      message: (error as Error).message || 'Failed to start sync'
    });
  }
}
