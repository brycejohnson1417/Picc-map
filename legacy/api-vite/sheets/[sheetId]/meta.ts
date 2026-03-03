import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_auth.js';
import { sheetsConfigured, sheetsFetch } from '../../_google.js';

const first = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] : value || '');

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ok = requireAuth(req, res);
  if (!ok) return;

  if (!sheetsConfigured()) {
    return res.status(500).json({
      error: 'Google Sheets is not configured. Set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON in Vercel.',
    });
  }

  const sheetId = safeDecode(first(req.query.sheetId));
  if (!sheetId) {
    return res.status(400).json({ error: 'sheetId is required' });
  }

  try {
    const response = await sheetsFetch(`spreadsheets/${encodeURIComponent(sheetId)}`, {
      fields: 'properties.title,sheets.properties',
      includeGridData: 'false',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: (data as { error?: { message?: string } })?.error?.message || 'Sheets API request failed',
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch Google Sheets metadata',
    });
  }
}
