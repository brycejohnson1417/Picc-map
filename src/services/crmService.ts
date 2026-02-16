import { searchDatabases } from './notionService';

export interface CRMRecord {
  id: string;
  name: string;
  accountStatus: string;
  vendorDayStatus: string;
  city: string;
  rep: string;
  lastEdited: string;
  notionUrl?: string;
}

const propText = (prop: any): string => {
  if (!prop) return '';
  if (prop.type === 'title') return (prop.title || []).map((t: any) => t.plain_text || '').join(' ').trim();
  if (prop.type === 'rich_text') return (prop.rich_text || []).map((t: any) => t.plain_text || '').join(' ').trim();
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'status') return prop.status?.name || '';
  if (prop.type === 'multi_select') return (prop.multi_select || []).map((m: any) => m.name).join(', ');
  if (prop.type === 'people') return (prop.people || []).map((p: any) => p.name || p.person?.email || 'Unknown').join(', ');
  if (prop.type === 'formula') {
    const f = prop.formula;
    if (!f) return '';
    if (typeof f.string === 'string') return f.string;
    if (typeof f.number === 'number') return String(f.number);
    if (typeof f.boolean === 'boolean') return f.boolean ? 'true' : 'false';
  }
  return '';
};

const readByName = (props: Record<string, any>, hints: string[]): string => {
  const entries = Object.entries(props || {});
  const hit = entries.find(([name]) => hints.some((h) => name.toLowerCase().includes(h)));
  return hit ? propText(hit[1]) : '';
};

const getTitle = (props: Record<string, any>): string => {
  const titleProp = Object.values(props || {}).find((p: any) => p?.type === 'title');
  return propText(titleProp) || 'Untitled';
};

const resolveCrmDbId = async (): Promise<string | null> => {
  const raw = localStorage.getItem('notion_db_map');
  const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  if (map.crm) return map.crm;

  const dbs = await searchDatabases();
  const found = dbs.find((d) => d.title.toLowerCase().includes('dispensary master list crm') || d.title.toLowerCase().includes('master list crm'));
  if (!found) return null;

  map.crm = found.id;
  localStorage.setItem('notion_db_map', JSON.stringify(map));
  return found.id;
};

export const loadCRMRecords = async (): Promise<CRMRecord[]> => {
  const dbId = await resolveCrmDbId();
  if (!dbId) return [];

  const res = await fetch(`/api/notion/databases/${dbId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_size: 200 }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  const results = data.results || [];

  return results.map((p: any) => {
    const props = p.properties || {};
    return {
      id: p.id,
      name: getTitle(props),
      accountStatus: readByName(props, ['account status', 'status']),
      vendorDayStatus: readByName(props, ['vendor day status', 'vendor day']),
      city: readByName(props, ['city', 'location', 'address']),
      rep: readByName(props, ['rep', 'ambassador', 'owner']),
      lastEdited: p.last_edited_time || '',
      notionUrl: p.url,
    } as CRMRecord;
  });
};
