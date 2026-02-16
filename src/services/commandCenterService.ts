import { searchDatabases } from './notionService';

export interface CommandCenterMetrics {
  customers: number;
  leads: number;
  openWorkOrders: number;
  pendingVendorSubmissions: number;
  activeInventorySkus: number;
  recentUpdates: { title: string; source: string; lastEdited: string }[];
  dbMap: Record<string, string>;
  source: 'api' | 'fallback';
}

type NotionPageResult = {
  id: string;
  last_edited_time?: string;
  properties?: Record<string, any>;
};

const DB_KEYS = {
  crm: 'crm',
  workOrders: 'workOrders',
  vendorSubmissions: 'vendorSubmissions',
  inventory: 'inventory',
  wiki: 'wiki',
} as const;

const DB_TITLE_HINTS: Record<string, string[]> = {
  [DB_KEYS.crm]: ['Dispensary Master List CRM', 'Master List CRM'],
  [DB_KEYS.workOrders]: ['Work Orders'],
  [DB_KEYS.vendorSubmissions]: ['Vendor Day Submissions', 'Vendor Day'],
  [DB_KEYS.inventory]: ['Inventory'],
  [DB_KEYS.wiki]: ['PICC Sales Wiki', 'Sales Wiki'],
};

const getDbMap = async (): Promise<Record<string, string>> => {
  const raw = localStorage.getItem('notion_db_map');
  const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};

  const missing = Object.keys(DB_TITLE_HINTS).filter((k) => !map[k]);
  if (missing.length === 0) return map;

  const dbs = await searchDatabases();
  for (const key of missing) {
    const hints = DB_TITLE_HINTS[key].map((h) => h.toLowerCase());
    const found = dbs.find((db) => hints.some((h) => db.title.toLowerCase().includes(h)));
    if (found) map[key] = found.id;
  }

  localStorage.setItem('notion_db_map', JSON.stringify(map));
  if (map.wiki) localStorage.setItem('notion_db_id', map.wiki);
  return map;
};

const fetchDb = async (dbId?: string, pageSize = 100): Promise<NotionPageResult[]> => {
  if (!dbId) return [];
  const res = await fetch(`/api/notion/databases/${dbId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_size: pageSize }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
};

const propText = (prop: any): string => {
  if (!prop) return '';
  if (prop.type === 'title') return (prop.title || []).map((t: any) => t.plain_text || '').join(' ');
  if (prop.type === 'rich_text') return (prop.rich_text || []).map((t: any) => t.plain_text || '').join(' ');
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'multi_select') return (prop.multi_select || []).map((m: any) => m.name).join(' ');
  if (prop.type === 'status') return prop.status?.name || '';
  if (prop.type === 'checkbox') return prop.checkbox ? 'true' : 'false';
  if (prop.type === 'number') return String(prop.number ?? '');
  if (prop.type === 'formula') {
    const f = prop.formula;
    if (!f) return '';
    if (typeof f.string === 'string') return f.string;
    if (typeof f.number === 'number') return String(f.number);
    if (typeof f.boolean === 'boolean') return f.boolean ? 'true' : 'false';
  }
  return '';
};

const readByName = (props: Record<string, any>, matches: string[]): string => {
  const entries = Object.entries(props || {});
  const found = entries.find(([name]) => matches.some((m) => name.toLowerCase().includes(m)));
  if (!found) return '';
  return propText(found[1]);
};

const getTitle = (props: Record<string, any>): string => {
  const titleProp = Object.values(props || {}).find((p: any) => p?.type === 'title');
  return propText(titleProp) || 'Untitled';
};

export const loadCommandCenterMetrics = async (): Promise<CommandCenterMetrics> => {
  try {
    const dbMap = await getDbMap();

    const [crm, workOrders, submissions, inventory, wiki] = await Promise.all([
      fetchDb(dbMap.crm),
      fetchDb(dbMap.workOrders),
      fetchDb(dbMap.vendorSubmissions),
      fetchDb(dbMap.inventory),
      fetchDb(dbMap.wiki),
    ]);

    let customers = 0;
    let leads = 0;
    crm.forEach((p) => {
      const props = p.properties || {};
      const status = (readByName(props, ['account status', 'status']) || '').toLowerCase();
      if (status.includes('customer')) customers += 1;
      if (status.includes('lead')) leads += 1;
    });

    let openWorkOrders = 0;
    workOrders.forEach((p) => {
      const props = p.properties || {};
      const status = (readByName(props, ['status']) || '').toLowerCase();
      if (!status || !(status.includes('done') || status.includes('complete') || status.includes('archiv') || status.includes('closed') || status.includes('resolved'))) {
        openWorkOrders += 1;
      }
    });

    let pendingVendorSubmissions = 0;
    submissions.forEach((p) => {
      const props = p.properties || {};
      const status = (readByName(props, ['status', 'review', 'approval']) || '').toLowerCase();
      if (!status || status.includes('pending') || status.includes('new') || status.includes('submitted') || status.includes('progress')) {
        pendingVendorSubmissions += 1;
      }
    });

    let activeInventorySkus = 0;
    inventory.forEach((p) => {
      const props = p.properties || {};
      const active = (readByName(props, ['active', 'is_active', 'status']) || '').toLowerCase();
      if (!active || active === 'true' || active.includes('active')) activeInventorySkus += 1;
    });

    const updates = [...crm, ...workOrders, ...submissions, ...wiki]
      .map((p) => ({
        title: getTitle(p.properties || {}),
        source:
          crm.includes(p) ? 'CRM' : workOrders.includes(p) ? 'Work Orders' : submissions.includes(p) ? 'Vendor Submissions' : 'Wiki',
        lastEdited: p.last_edited_time || '',
      }))
      .sort((a, b) => (a.lastEdited < b.lastEdited ? 1 : -1))
      .slice(0, 6);

    return {
      customers,
      leads,
      openWorkOrders,
      pendingVendorSubmissions,
      activeInventorySkus,
      recentUpdates: updates,
      dbMap,
      source: 'api',
    };
  } catch {
    return {
      customers: 0,
      leads: 0,
      openWorkOrders: 0,
      pendingVendorSubmissions: 0,
      activeInventorySkus: 0,
      recentUpdates: [],
      dbMap: {},
      source: 'fallback',
    };
  }
};
