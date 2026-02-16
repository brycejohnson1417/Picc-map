import { searchDatabases } from './notionService';
import { PICC_DEFAULT_DB_MAP, PICC_LOCKED_MODE } from '../config/piccDefaults';

export type DbMappingKey =
  | 'crm'
  | 'workOrders'
  | 'vendorSubmissions'
  | 'inventory'
  | 'wiki'
  | 'finance'
  | 'team';

export const DB_FIELDS: { key: DbMappingKey; label: string; required: boolean }[] = [
  { key: 'crm', label: 'CRM Database', required: true },
  { key: 'workOrders', label: 'Work Orders Database', required: true },
  { key: 'vendorSubmissions', label: 'Vendor Submissions Database', required: true },
  { key: 'inventory', label: 'Inventory Database', required: true },
  { key: 'wiki', label: 'Wiki Database', required: true },
  { key: 'finance', label: 'Finance Reports Database', required: false },
  { key: 'team', label: 'Team Directory Database', required: false },
];

const DB_TITLE_HINTS: Record<DbMappingKey, string[]> = {
  crm: ['Dispensary Master List CRM', 'Master List CRM'],
  workOrders: ['Work Orders'],
  vendorSubmissions: ['Vendor Day Submissions', 'Vendor Day'],
  inventory: ['Inventory'],
  wiki: ['PICC Sales Wiki', 'Sales Wiki'],
  finance: ['Finance', 'Revenue', 'P&L', 'Profit'],
  team: ['Team', 'Directory', 'Employees', 'Reps', 'Ambassadors'],
};

export interface NotionPageResult {
  id: string;
  url?: string;
  last_edited_time?: string;
  properties?: Record<string, unknown>;
}

export const getSavedDbMap = (): Record<string, string> => {
  const raw = localStorage.getItem('notion_db_map');
  let stored: Record<string, string> = {};
  if (raw) {
    try {
      stored = JSON.parse(raw) as Record<string, string>;
    } catch {
      stored = {};
    }
  }

  if (PICC_LOCKED_MODE) {
    return { ...stored, ...PICC_DEFAULT_DB_MAP } as Record<string, string>;
  }

  return { ...PICC_DEFAULT_DB_MAP, ...stored } as Record<string, string>;
};

export const saveDbMap = (dbMap: Record<string, string>): void => {
  const finalMap = PICC_LOCKED_MODE ? ({ ...dbMap, ...PICC_DEFAULT_DB_MAP } as Record<string, string>) : dbMap;
  localStorage.setItem('notion_db_map', JSON.stringify(finalMap));
  if (finalMap.wiki) localStorage.setItem('notion_db_id', finalMap.wiki);
};

export const getMissingMappings = (dbMap: Record<string, string>): DbMappingKey[] => {
  return DB_FIELDS.filter((field) => field.required && !dbMap[field.key]).map((field) => field.key);
};

export const resolveDbMap = async (): Promise<Record<string, string>> => {
  const map = getSavedDbMap();
  const missing = DB_FIELDS.map((field) => field.key).filter((key) => !map[key]);
  if (missing.length === 0) {
    saveDbMap(map);
    return map;
  }

  const dbs = await searchDatabases();
  missing.forEach((key) => {
    const mappedKey = key as DbMappingKey;
    const hints = DB_TITLE_HINTS[mappedKey].map((hint) => hint.toLowerCase());
    const found = dbs.find((db) => hints.some((hint) => db.title.toLowerCase().includes(hint)));
    if (found) map[mappedKey] = found.id;
  });

  saveDbMap(map);
  return getSavedDbMap();
};

export const queryDatabase = async (dbId?: string, pageSize = 200): Promise<NotionPageResult[]> => {
  if (!dbId) return [];

  const all: NotionPageResult[] = [];
  let hasMore = true;
  let startCursor: string | undefined;
  let pageCount = 0;
  const MAX_PAGES = 50;

  while (hasMore) {
    pageCount += 1;
    if (pageCount > MAX_PAGES) {
      throw new Error('Notion query aborted: pagination limit reached (50 pages).');
    }
    const response = await fetch(`/api/notion/databases/${dbId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: pageSize, start_cursor: startCursor }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      let message = `Notion query failed (${response.status})`;

      if (responseText) {
        try {
          const parsed = JSON.parse(responseText) as { error?: string; message?: string };
          message = parsed.message || parsed.error || message;
        } catch {
          message = `${message}: ${responseText.slice(0, 180)}`;
        }
      }

      throw new Error(message);
    }

    const data = (await response.json()) as {
      results?: NotionPageResult[];
      has_more?: boolean;
      next_cursor?: string | null;
    };

    all.push(...(data.results ?? []));
    hasMore = Boolean(data.has_more && data.next_cursor);
    startCursor = data.next_cursor ?? undefined;
  }

  return all;
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>;
  return {};
};

const toArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'object' && item !== null) as Record<string, unknown>[];
  return [];
};

export const propText = (prop: unknown): string => {
  const p = toRecord(prop);
  const type = typeof p.type === 'string' ? p.type : '';

  if (type === 'title') {
    return toArray(p.title).map((item) => String(item.plain_text ?? '')).join(' ').trim();
  }
  if (type === 'rich_text') {
    return toArray(p.rich_text).map((item) => String(item.plain_text ?? '')).join(' ').trim();
  }
  if (type === 'select') {
    return String(toRecord(p.select).name ?? '');
  }
  if (type === 'status') {
    return String(toRecord(p.status).name ?? '');
  }
  if (type === 'multi_select') {
    return toArray(p.multi_select).map((item) => String(item.name ?? '')).filter(Boolean).join(', ');
  }
  if (type === 'people') {
    return toArray(p.people)
      .map((person) => String(person.name ?? toRecord(person.person).email ?? ''))
      .filter(Boolean)
      .join(', ');
  }
  if (type === 'email') return String(p.email ?? '');
  if (type === 'phone_number') return String(p.phone_number ?? '');
  if (type === 'url') return String(p.url ?? '');
  if (type === 'number') return p.number === null || p.number === undefined ? '' : String(p.number);
  if (type === 'checkbox') return p.checkbox ? 'true' : 'false';
  if (type === 'formula') {
    const formula = toRecord(p.formula);
    if (typeof formula.string === 'string') return formula.string;
    if (typeof formula.number === 'number') return String(formula.number);
    if (typeof formula.boolean === 'boolean') return formula.boolean ? 'true' : 'false';
    if (typeof formula.date === 'object' && formula.date !== null) {
      return String(toRecord(formula.date).start ?? '');
    }
  }
  if (type === 'date') {
    return String(toRecord(p.date).start ?? '');
  }

  return '';
};

export const propNumber = (prop: unknown): number | null => {
  const p = toRecord(prop);
  const type = typeof p.type === 'string' ? p.type : '';
  if (type === 'number' && typeof p.number === 'number') return p.number;

  const asText = propText(prop);
  const cleaned = asText.replace(/[$,%\s,]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const readByName = (props: Record<string, unknown>, hints: string[]): string => {
  const entries = Object.entries(props);
  const hit = entries.find(([name]) => hints.some((hint) => name.toLowerCase().includes(hint)));
  return hit ? propText(hit[1]) : '';
};

export const readNumberByName = (props: Record<string, unknown>, hints: string[]): number | null => {
  const entries = Object.entries(props);
  const hit = entries.find(([name]) => hints.some((hint) => name.toLowerCase().includes(hint)));
  return hit ? propNumber(hit[1]) : null;
};

export const getTitle = (props: Record<string, unknown>): string => {
  const titleProp = Object.values(props).find((value) => {
    const record = toRecord(value);
    return record.type === 'title';
  });

  return propText(titleProp) || 'Untitled';
};

export const normalizeStatus = (value: string): string => value.trim().toLowerCase();

export const isClosedStatus = (status: string): boolean => {
  const normalized = normalizeStatus(status);
  if (!normalized) return false;
  return ['done', 'complete', 'completed', 'archived', 'closed', 'resolved', 'approved & connected'].some((word) =>
    normalized.includes(word),
  );
};

export const isPendingStatus = (status: string): boolean => {
  const normalized = normalizeStatus(status);
  if (!normalized) return true;
  return ['pending', 'new', 'submitted', 'in progress', 'onboarding', 'api key needed', 'invited', 'not started'].some((word) =>
    normalized.includes(word),
  );
};
