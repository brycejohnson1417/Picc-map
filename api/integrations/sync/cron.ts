import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSourceRows } from '../../lib/db';
import { runSourceSync } from '../../lib/syncRunner';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const force = String(req.query.force || '') === '1';
  const limit = Number.parseInt(String(req.query.limit || ''), 10);
  const sources = await getSourceRows();
  const selected = limit > 0 ? sources.slice(0, limit) : sources;
  const summary: { sourceId: string; status: 'started' | 'skipped' | 'failed'; message: string }[] = [];

  for (const source of selected) {
    if (!source.isActive) {
      summary.push({ sourceId: source.id, status: 'skipped', message: 'inactive' });
      continue;
    }

    try {
      await runSourceSync(source.id, { force, createdBy: 'cron' });
      summary.push({ sourceId: source.id, status: 'started', message: 'sync complete' });
    } catch (error) {
      summary.push({ sourceId: source.id, status: 'failed', message: (error as Error).message });
    }
  }

  return res.status(200).json({
    executed: summary.length,
    forced: force,
    summary
  });
}
