import { getTitle, propText, queryDatabase, readByName, resolveDbMap } from './notionDataService';

export interface CRMPropertyField {
  name: string;
  value: string;
}

export interface CRMRecord {
  id: string;
  name: string;
  accountStatus: string;
  vendorDayStatus: string;
  city: string;
  rep: string;
  lastEdited: string;
  notionUrl?: string;
  properties: CRMPropertyField[];
}

const exactOrHint = (props: Record<string, unknown>, exact: string[], hints: string[]): string => {
  for (const key of exact) {
    if (props[key] !== undefined) {
      const text = propText(props[key]);
      if (text) return text;
    }
  }
  return readByName(props, hints);
};

export const loadCRMRecords = async (): Promise<CRMRecord[]> => {
  const dbMap = await resolveDbMap();
  if (!dbMap.crm) return [];

  const results = await queryDatabase(dbMap.crm);

  return results.map((page) => {
    const props = (page.properties ?? {}) as Record<string, unknown>;
    const properties = Object.entries(props)
      .map(([name, value]) => ({ name, value: propText(value) || '—' }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: page.id,
      name: getTitle(props),
      accountStatus: exactOrHint(props, ['Account Status', 'Status'], ['account status', 'status']),
      vendorDayStatus: exactOrHint(props, ['Vendor Day Status'], ['vendor day status', 'vendor day']),
      city: exactOrHint(props, ['City', 'Location City'], ['city', 'location city', 'location', 'address']),
      rep: exactOrHint(props, ['Assigned Rep', 'Rep', 'Brand Ambassador'], ['assigned rep', 'rep', 'ambassador', 'owner']),
      lastEdited: page.last_edited_time || '',
      notionUrl: page.url,
      properties,
    };
  });
};
