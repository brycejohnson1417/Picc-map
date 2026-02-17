import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  completeOutbox,
  getMappingsForSource,
  getSource,
  putOutbox
} from '../../lib/db';
import { notionCreatePage, notionUpdatePage } from '../../lib/notionClient';
import { IntegrationSource } from '../../lib/types';

const toTitle = (value: unknown): string => (typeof value === 'string' ? value : '');
const toText = (value: unknown): string => (typeof value === 'string' ? value : '');
const toArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
};

const buildProperties = (module: string, source: IntegrationSource, payload: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> => {
  if (module === 'wiki') {
    const titleField = fieldMap.title || 'Name';
    const categoryField = fieldMap.category || 'Category';
    const tagsField = fieldMap.tags || 'Tags';
    const contentField = fieldMap.content || 'Content';

    return {
      [titleField]: {
        title: [{ text: { content: toText(payload.title) || 'Untitled' } }]
      },
      [categoryField]: {
        select: { name: toText(payload.category) || 'General' }
      },
      [tagsField]: {
        multi_select: toArray(payload.tags).map((tag) => ({ name: tag }))
      },
      [contentField]: {
        rich_text: [{ text: { content: toText(payload.content) } }]
      }
    };
  }

  const properties: Record<string, unknown> = {};
  Object.entries(payload).forEach(([key, value]) => {
    const field = fieldMap[key] || key;
    properties[field] = {
      rich_text: [{ text: { content: String(value ?? '') } }]
    };
  });

  return properties;
};

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
  const module = String(body.module || source.module);
  const requestId = toTitle(body.requestId || '');

  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  try {
    const mappings = await getMappingsForSource(source.id);
    const mapping = mappings.find((entry) => entry.module === module && entry.isActive);
    const fieldMap = mapping?.fieldMap || {};

    const payload = (body.payload && typeof body.payload === 'object'
      ? (body.payload as Record<string, unknown>)
      : {}) as Record<string, unknown>;

    const outbox = await putOutbox(source, requestId, 'create', payload);
    if (outbox.status !== 'pending') {
      return res.status(200).json({ id: outbox.result?.id, deduped: true });
    }

    const properties = buildProperties(module, source, payload, fieldMap);
    const notionId = await notionCreatePage(source, properties);

    await completeOutbox(outbox.id, 'done', { id: notionId });
    return res.status(200).json({ id: notionId });
  } catch (error) {
    return res.status(500).json({
      error: 'Create failed',
      message: (error as Error).message
    });
  }
}
