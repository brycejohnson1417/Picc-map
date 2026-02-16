import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req, res)) return;

  const { path } = req.query;
  const notionPath = Array.isArray(path) ? path.join('/') : path;

  const notionUrl = `https://api.notion.com/v1/${notionPath}`;
  const apiKey = process.env.NOTION_API_KEY;

  if (!apiKey) {
    console.error('Missing NOTION_API_KEY environment variable');
    return res.status(500).json({
      error: 'Server configuration error: Missing Notion API Key',
      message: 'Please set NOTION_API_KEY in your Vercel environment variables'
    });
  }

  try {
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method || 'GET') && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(notionUrl, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notion API Error (${response.status}):`, errorText);
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error forwarding to Notion',
      message: (error as Error).message
    });
  }
}
