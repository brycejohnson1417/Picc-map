import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureAdmin, getSource, patchSource, upsertMapping } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sourceId = String(req.query.sourceId || '');
  if (!sourceId) {
    return res.status(400).json({ error: 'Missing sourceId' });
  }

  if (req.method === 'GET') {
    const source = await getSource(sourceId);
    if (!source) {
      return res.status(404).json({ error: 'Source not found.' });
    }
    return res.status(200).json(source);
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ensureAdmin(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const body = req.body || {};
  try {
    const mappingPayload = body.mapping || body;
    const source = await patchSource(sourceId, {
      targetId: body.targetId,
      name: body.name,
      isActive: body.isActive,
      settings: body.settings,
      module: body.module
    });

    const hasFieldMap = Boolean(body.fieldMap) || Boolean(body.transformRules);
    const hasNestedFieldMap = Boolean(mappingPayload?.fieldMap) || Boolean(mappingPayload?.transformRules);
    if ((hasFieldMap || hasNestedFieldMap) && source.module) {
      const mapping = await upsertMapping(source.id, source.module, {
        fieldMap: mappingPayload.fieldMap,
        transformRules: mappingPayload.transformRules,
        isActive: mappingPayload.mappingIsActive ?? body.mappingIsActive
      });
      return res.status(200).json({ ...source, mapping });
    }

    return res.status(200).json(source);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to patch source.',
      message: (error as Error).message
    });
  }
}
