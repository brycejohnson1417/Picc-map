import { VercelRequest, VercelResponse } from '@vercel/node';
import { notionValidate, notionQueryDatabase, notionSearchDatabases } from '../../lib/notionClient';
import { getMappingsForSource, getSource } from '../../lib/db';

const safeText = (value: unknown): string => (typeof value === 'string' ? value : '');
const toTextList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => {
    if (typeof entry === 'string') {
      return entry;
    }
    if (entry && typeof entry === 'object' && 'name' in entry && typeof (entry as { name: string }).name === 'string') {
      return (entry as { name: string }).name;
    }
    return '';
  }).filter(Boolean);
};

const parsePropertyText = (props: Record<string, unknown>, name: string): string => {
  const prop = props[name] as Record<string, unknown> | undefined;
  if (!prop) return '';

  if (Array.isArray(prop.title) && prop.title[0] && typeof prop.title[0] === 'object') {
    return safeText((prop.title[0] as { plain_text?: string }).plain_text);
  }
  if (Array.isArray(prop.rich_text) && prop.rich_text[0] && typeof prop.rich_text[0] === 'object') {
    return safeText((prop.rich_text[0] as { plain_text?: string }).plain_text);
  }
  return '';
};

const parseSelect = (props: Record<string, unknown>, name: string): string => {
  const prop = props[name] as { select?: { name?: string } } | undefined;
  return safeText(prop?.select?.name);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sourceId = String(req.query.sourceId || '');
  if (!sourceId) {
    return res.status(400).json({ error: 'Missing sourceId' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = String(req.query.action || 'query');
  const module = String(req.query.module || 'wiki');

  try {
    const source = await getSource(sourceId);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    if (action === 'validate') {
      const payload = await notionValidate();
      return res.status(200).json(payload);
    }

    if (action === 'databases') {
      const databases = await notionSearchDatabases();
      return res.status(200).json(
        databases.map((entry) => {
          const db = entry as Record<string, unknown>;
          return {
            id: safeText(db.id),
            title: safeText((db.title?.[0] as { plain_text?: string })?.plain_text),
            url: safeText(db.url),
            lastEdited: safeText(db.last_edited_time)
          };
        })
      );
    }

    const mappings = await getMappingsForSource(sourceId);
    const mapping = mappings.find((item) => item.module === module && item.isActive) || mappings[0];
    const fieldMap = mapping?.fieldMap || {};

    const titleField = fieldMap.title || 'Name';
    const categoryField = fieldMap.category || 'Category';
    const tagsField = fieldMap.tags || 'Tags';
    const contentField = fieldMap.content || 'Content';

    const body: { page_size?: number; start_cursor?: string | null; filter?: Record<string, unknown> } = {
      page_size: Number(req.query.page_size || 50)
    };

    if (typeof req.query.start_cursor === 'string') {
      body.start_cursor = req.query.start_cursor;
    }

    if (typeof req.query.filter_after === 'string' && req.query.filter_after) {
      body.filter = {
        property: 'last_edited_time',
        timestamp: 'last_edited_time',
        last_edited_time: { on_or_after: req.query.filter_after }
      };
    }

    const data = await notionQueryDatabase(source, body);
    const results = data.results.map((entry) => {
      const row = entry as Record<string, unknown>;
      const props = (row.properties || {}) as Record<string, unknown>;
      return {
        id: safeText(row.id),
        title: parsePropertyText(props, titleField) || 'Untitled',
        category: parseSelect(props, categoryField) || 'General',
        tags: toTextList((props[tagsField] as unknown as { multi_select?: Array<{ name?: string }> })?.multi_select),
        content: parsePropertyText(props, contentField) || '',
        notionUrl: safeText(row.url),
        lastEdited: safeText(row.last_edited_time)
      };
    });

    return res.status(200).json({
      sourceId,
      module,
      results,
      hasMore: data.has_more,
      nextCursor: data.next_cursor,
      sourceVersion: data.results.length ? safeText((data.results[0] as Record<string, unknown>)?.last_edited_time) : undefined
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Notion query failed',
      message: (error as Error).message
    });
  }
}
