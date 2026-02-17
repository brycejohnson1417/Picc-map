import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMappingsForSource, getSource } from '../../lib/db';
import { getSheetValues, hashValues } from '../../lib/sheetsClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sourceId = String(req.query.sourceId || '');
  if (!sourceId) {
    return res.status(400).json({ error: 'Missing sourceId' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const module = String(req.query.module || 'ppp_onboarding');
  const requestedRange = String(req.query.range || '');

  const source = await getSource(sourceId);
  if (!source) {
    return res.status(404).json({ error: 'Source not found' });
  }

  const mappings = await getMappingsForSource(source.id);
  const mapping = mappings.find((entry) => entry.module === module && entry.isActive);
  const defaultRange = String(source.settings?.range || 'A1:H1000');
  const range = requestedRange && requestedRange !== 'undefined' ? requestedRange : defaultRange;

  if (!source.targetId) {
    return res.status(400).json({ error: 'Source targetId missing' });
  }

  try {
    const valuesResponse = await getSheetValues({ sheetId: source.targetId, range });
    const checksum = hashValues(valuesResponse.values);

    const force = String(req.query.force || '') === 'true';
    if (!force && mapping && mapping.transformRules?.checksum && mapping.transformRules.checksum === checksum) {
      return res.status(200).json({
        sourceId,
        range: valuesResponse.range,
        values: [],
        checksum,
        stale: false,
        skipped: true
      });
    }

    return res.status(200).json({
      sourceId,
      range: valuesResponse.range,
      values: valuesResponse.values,
      checksum,
      stale: false,
      skipped: false
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to read sheets range',
      message: (error as Error).message
    });
  }
}
