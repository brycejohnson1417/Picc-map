import { getTitle, propText, queryDatabase, resolveDbMap } from './notionDataService';

export interface CRMPropertyField {
  name: string;
  value: string;
}

export interface CRMRecord {
  id: string;
  name: string;
  accountStatus: string;
  accountStatusNormalized: string;
  vendorDayStatus: string;
  vendorDayStatusNormalized: string;
  city: string;
  region: string;
  rep: string;
  lastVendorDayDate: string;
  lastEdited: string;
  notionUrl?: string;
  properties: CRMPropertyField[];
}

interface FieldResolutionConfig {
  preferred: string[];
  hints: string[];
}

const FIELD_MAP: Record<string, FieldResolutionConfig> = {
  accountStatus: {
    preferred: ['Account Status', 'Status'],
    hints: ['account status', 'customer status', 'status'],
  },
  vendorDayStatus: {
    preferred: ['Vendor Day Status', 'VD Status', 'Vendor Status'],
    hints: ['vendor day status', 'vendor status', 'vendor day'],
  },
  city: {
    preferred: ['City', 'Location City'],
    hints: ['city', 'town'],
  },
  region: {
    preferred: ['Region', 'Area', 'Territory'],
    hints: ['region', 'territory', 'area', 'county'],
  },
  rep: {
    preferred: ['Assigned Rep', 'Rep', 'Brand Ambassador', 'BA'],
    hints: ['assigned rep', 'rep', 'ambassador', 'owner'],
  },
  lastVendorDayDate: {
    preferred: ['Last Vendor Day Date', 'Vendor Day Date', 'Most Recent Vendor Day'],
    hints: ['last vendor day', 'vendor day date', 'event date', 'last event'],
  },
};

const normalizeStatus = (value: string): string => {
  const v = value.trim().toLowerCase();
  if (!v) return 'unknown';

  if (['not started', 'new', 'to schedule', 'unscheduled'].some((k) => v.includes(k))) return 'not_started';
  if (['asap', 'urgent', 'priority'].some((k) => v.includes(k))) return 'asap';
  if (['scheduled', 'booked', 'calendar'].some((k) => v.includes(k))) return 'scheduled';
  if (['in progress', 'in-progress', 'active', 'ongoing'].some((k) => v.includes(k))) return 'in_progress';
  if (['awaiting report', 'awaiting reports', 'report pending', 'pending report'].some((k) => v.includes(k))) return 'awaiting_reports';
  if (['done', 'completed', 'complete', 'closed'].some((k) => v.includes(k))) return 'done';

  return v.replace(/\s+/g, '_');
};

const findPropertyValue = (props: Record<string, unknown>, config: FieldResolutionConfig): string => {
  const entries = Object.entries(props);

  for (const pref of config.preferred) {
    const exact = entries.find(([name]) => name.toLowerCase() === pref.toLowerCase());
    if (exact) {
      const value = propText(exact[1]);
      if (value) return value;
    }
  }

  const fallback = entries.find(([name]) => config.hints.some((hint) => name.toLowerCase().includes(hint)));
  return fallback ? propText(fallback[1]) : '';
};

const safeDate = (raw: string): string => {
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export const loadCRMRecords = async (): Promise<CRMRecord[]> => {
  const dbMap = await resolveDbMap();
  if (!dbMap.crm) return [];

  const results = await queryDatabase(dbMap.crm);

  return results.map((page) => {
    const props = (page.properties ?? {}) as Record<string, unknown>;
    const accountStatus = findPropertyValue(props, FIELD_MAP.accountStatus);
    const vendorDayStatus = findPropertyValue(props, FIELD_MAP.vendorDayStatus);
    const city = findPropertyValue(props, FIELD_MAP.city);
    const region = findPropertyValue(props, FIELD_MAP.region);
    const rep = findPropertyValue(props, FIELD_MAP.rep);
    const lastVendorDayDate = safeDate(findPropertyValue(props, FIELD_MAP.lastVendorDayDate));

    const properties = Object.entries(props)
      .map(([name, value]) => ({ name, value: propText(value) || '—' }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: page.id,
      name: getTitle(props),
      accountStatus: accountStatus || 'Unknown',
      accountStatusNormalized: normalizeStatus(accountStatus),
      vendorDayStatus: vendorDayStatus || 'Unknown',
      vendorDayStatusNormalized: normalizeStatus(vendorDayStatus),
      city: city || '—',
      region: region || '—',
      rep: rep || 'Unassigned',
      lastVendorDayDate,
      lastEdited: page.last_edited_time || '',
      notionUrl: page.url,
      properties,
    };
  });
};
