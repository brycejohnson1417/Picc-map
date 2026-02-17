import { IntegrationModuleKey, IntegrationSource } from './types';
import {
  getMappingsForSource,
  getSource,
  isSourceSyncRunning,
  openJob,
  writeNormalizedEntities,
  upsertCheckpoint,
  closeJob
} from './db';
import { notionQueryDatabase, notionSearchDatabases } from './notionClient';
import { getSheetValues, hashValues } from './sheetsClient';

interface SyncOptions {
  force?: boolean;
  createdBy?: string;
  maxPages?: number;
}

const pick = (propertyMap: Record<string, string>, key: string): string => propertyMap[key] || key;
const toSafeText = (value: unknown): string => (typeof value === 'string' ? value : '');

const parseNotionText = (value: unknown): string => {
  if (!value || typeof value !== 'object') {
    return '';
  }
  const asObject = value as Record<string, unknown>;
  if (Array.isArray(asObject.title) && asObject.title[0] && typeof asObject.title[0] === 'object') {
    return toSafeText((asObject.title[0] as Record<string, unknown>).plain_text);
  }
  if (Array.isArray(asObject.rich_text) && asObject.rich_text[0] && typeof asObject.rich_text[0] === 'object') {
    return toSafeText((asObject.rich_text[0] as Record<string, unknown>).plain_text);
  }
  return '';
};

const parseNotionSelect = (value: unknown): string => {
  if (!value || typeof value !== 'object') {
    return '';
  }
  return toSafeText((value as Record<string, unknown>).name);
};

const parseNotionMultiSelect = (value: unknown): string[] => {
  if (!Array.isArray((value as Record<string, unknown>)?.multi_select)) {
    return [];
  }
  return (value as { multi_select: Array<{ name?: string }> }).multi_select
    .map((entry) => entry?.name)
    .filter((entry): entry is string => Boolean(entry));
};

const safeDate = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  return value;
};

const parseIntSafe = (value: unknown): number | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const runSourceSync = async (sourceId: string, options: SyncOptions = {}): Promise<void> => {
  const source = await getSource(sourceId);
  if (!source) {
    throw new Error(`Source ${sourceId} not found.`);
  }

  if (!options.force && (await isSourceSyncRunning(source.id))) {
    throw new Error(`Source ${source.id} sync already running.`);
  }

  const mappings = await getMappingsForSource(source.id);
  const mapping = mappings.find((entry) => entry.module === source.module && entry.isActive);
  const fieldMap = mapping?.fieldMap || {};
  const transformRules = mapping?.transformRules || {};
  const checkpoint = await upsertCheckpoint(source.id, source.module, {
    lastSyncStatus: 'running',
    lastSyncedAt: new Date().toISOString()
  });
  const jobId = await openJob(source.id, source.module, options.createdBy || 'system');

  try {
    if (source.type === 'notion') {
      const latestCursor = await syncFromNotion(source, fieldMap, transformRules, checkpoint.cursor, options.maxPages);
      if (latestCursor) {
        await upsertCheckpoint(source.id, source.module, {
          cursor: latestCursor,
          lastSyncStatus: 'success',
          lastSyncedAt: new Date().toISOString()
        });
      } else {
        await upsertCheckpoint(source.id, source.module, {
          lastSyncStatus: 'success',
          lastSyncedAt: new Date().toISOString()
        });
      }
      await closeJob(jobId, 'success', 'Notion sync complete.');
      return;
    }

    const checksum = await syncFromSheets(source, fieldMap, transformRules);
    await upsertCheckpoint(source.id, source.module, {
      checksum,
      lastSyncStatus: 'success',
      lastSyncedAt: new Date().toISOString()
    });
    await closeJob(jobId, 'success', 'Sheets sync complete.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Source sync failed.';
    await upsertCheckpoint(source.id, source.module, {
      lastSyncStatus: 'error',
      lastSyncedAt: new Date().toISOString()
    });
    await closeJob(jobId, 'error', message);
    throw error;
  }
};

const syncFromNotion = async (
  source: IntegrationSource,
  fieldMap: Record<string, string>,
  _transformRules: Record<string, unknown>,
  startingCursor: string | null,
  maxPages = 10
): Promise<string | null> => {
  const titleField = pick(fieldMap, 'title');
  const categoryField = pick(fieldMap, 'category');
  const tagsField = pick(fieldMap, 'tags');
  const contentField = pick(fieldMap, 'content');

  let hasMore = true;
  let nextCursor: string | null = null;
  let pagesRead = 0;
  let bestCursor: string | null = startingCursor;

  while (hasMore && pagesRead < maxPages) {
    const body: Record<string, unknown> = {
      page_size: 100
    };
    if (nextCursor) {
      body.start_cursor = nextCursor;
    }
    if (startingCursor) {
      body.filter = {
        property: 'last_edited_time',
        timestamp: 'last_edited_time',
        last_edited_time: {
          on_or_after: startingCursor
        }
      };
    }

    const response = await notionQueryDatabase(source, body);
    const rows = response.results.map((row) => row as Record<string, unknown>);
    const entities = rows.map((row) => {
      const properties = (row.properties || {}) as Record<string, unknown>;
      const title = parseNotionText(properties[titleField]);
      const category = parseNotionSelect((properties[categoryField] as Record<string, unknown>)?.select || properties[categoryField]);
      const tags = parseNotionMultiSelect((properties[tagsField] as Record<string, unknown>)?.multi_select || properties[tagsField]);
      const content = parseNotionText(properties[contentField]);

      return {
        sourceRecordId: toSafeText(row.id),
        sourceUpdatedAt: safeDate(row.last_edited_time),
        sourceVersion: safeDate(row.last_edited_time) || null,
        checksum: hashValues([[title, category, content, ...tags]]),
        canonical: {
          id: toSafeText(row.id),
          title: title || 'Untitled',
          category: category || 'General',
          tags,
          content,
          notionUrl: toSafeText((row as Record<string, unknown>).url),
          lastEdited: toSafeText((row as Record<string, unknown>).last_edited_time),
          syncStatus: 'synced'
        },
        module: source.module
      };
    });

    if (entities.length > 0) {
      await writeNormalizedEntities(source.id, source.module, entities);
      const cursor = entities.reduce<string | null>((acc, entity) => {
        if (!acc) {
          return entity.sourceUpdatedAt;
        }
        return (entity.sourceUpdatedAt && entity.sourceUpdatedAt > acc) ? entity.sourceUpdatedAt : acc;
      }, null);
      if (cursor) {
        bestCursor = cursor;
      }
    }

    hasMore = response.has_more;
    nextCursor = response.next_cursor;
    pagesRead += 1;
  }

  return bestCursor;
};

const normalizeField = (headers: string[], field: string, row: string[], fallbackSourceColumns: string[]): string => {
  const indexFromHeader = headers.indexOf(field);
  if (indexFromHeader >= 0) {
    return toSafeText(row[indexFromHeader]);
  }
  const fallbackIndex = fallbackSourceColumns.indexOf(field);
  if (fallbackIndex >= 0 && fallbackIndex < row.length) {
    return toSafeText(row[fallbackIndex]);
  }
  return '';
};

const syncFromSheets = async (
  source: IntegrationSource,
  fieldMap: Record<string, string>,
  transformRules: Record<string, unknown>
): Promise<string> => {
  const sheetId = source.targetId || '';
  const range = typeof source.settings?.range === 'string' ? source.settings.range : 'A1:Z2000';
  const response = await getSheetValues({ sheetId, range });
  const rows = response.values || [];

  const headerIndex = Number(transformRules.headerRow || 0);
  const fallbackSourceColumns = Array.isArray(transformRules.fallbackSourceColumns)
    ? transformRules.fallbackSourceColumns.filter((item): item is string => typeof item === 'string')
    : [];
  const headers = rows[headerIndex] || [];

  const entities = rows
    .slice(headerIndex + 1)
    .map((row, idx) => {
      const id = row[0] || `sheet-${idx}`;
      return {
        sourceRecordId: String(id),
        sourceUpdatedAt: undefined,
        sourceVersion: undefined,
        checksum: hashValues([row]),
        canonical: {
          id: String(id),
          name: normalizeField(headers, fieldMap.name, row, fallbackSourceColumns),
          pppStatus: normalizeField(headers, fieldMap.pppStatus, row, fallbackSourceColumns) || 'Not Started',
          location: normalizeField(headers, fieldMap.location, row, fallbackSourceColumns),
          contactPerson: normalizeField(headers, fieldMap.contactPerson, row, fallbackSourceColumns),
          licenseNumber: normalizeField(headers, fieldMap.licenseNumber, row, fallbackSourceColumns) || undefined,
          totalOrders: parseIntSafe(normalizeField(headers, fieldMap.totalOrders, row, fallbackSourceColumns)),
          totalOrderedAmount: normalizeField(headers, fieldMap.totalOrderedAmount, row, fallbackSourceColumns) || undefined,
          lastOrderDate: normalizeField(headers, fieldMap.lastOrderDate, row, fallbackSourceColumns) || undefined
        },
        module: source.module
      };
    })
    .filter((entity) => entity.canonical.name);

  if (entities.length > 0) {
    await writeNormalizedEntities(source.id, source.module, entities);
  }

  return hashValues(rows);
};

export const getNotionDatabaseOptions = async (_sourceId: string): Promise<
  { id: string; title: string; lastEdited: string; url: string }[]
> => {
  const results = await notionSearchDatabases();
  return results
    .map((entry) => entry as Record<string, unknown>)
    .map((entry) => ({
      id: toSafeText(entry.id),
      title: toSafeText((entry.title?.[0] as Record<string, unknown>)?.plain_text) || toSafeText(entry.id),
      lastEdited: toSafeText(entry.last_edited_time),
      url: toSafeText(entry.url)
    }));
};
