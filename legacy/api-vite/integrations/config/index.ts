import { VercelRequest, VercelResponse } from '@vercel/node';
import { getConfig } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = await getConfig();
    return res.status(200).json(config);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to read integration config.',
      message: (error as Error).message
    });
  }
}
