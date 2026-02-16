import { getTitle, propText, queryDatabase, resolveDbMap } from './notionDataService';
import { loadCRMRecords, type CRMRecord } from './crmService';

export interface BAOpsItem {
  id: string;
  storeName: string;
  rep: string;
  city: string;
  region: string;
  vendorDayStatus: string;
  source: 'crm' | 'vendorSubmissions';
  eventDate?: string;
  reportDueDate?: string;
  reportSubmittedDate?: string;
  lastEdited?: string;
  notionUrl?: string;
}

export interface BAOpsData {
  needsScheduling: BAOpsItem[];
  inProgress: BAOpsItem[];
  awaitingReports: BAOpsItem[];
  overdueFollowUps: BAOpsItem[];
  lastRefreshed: string;
  source: 'api' | 'fallback';
  warning?: string;
}

interface FieldResolutionConfig {
  preferred: string[];
  hints: string[];
}

const FIELD_MAP: Record<string, FieldResolutionConfig> = {
  storeName: {
    preferred: ['Dispensary', 'Store Name', 'Location Name', 'Account'],
    hints: ['dispensary', 'store', 'location', 'account'],
  },
  rep: {
    preferred: ['Assigned Rep', 'Rep', 'Brand Ambassador', 'BA', 'Owner'],
    hints: ['assigned rep', 'rep', 'ambassador', 'owner'],
  },
  city: {
    preferred: ['City', 'Location City'],
    hints: ['city', 'town'],
  },
  region: {
    preferred: ['Region', 'Area', 'Territory'],
    hints: ['region', 'territory', 'area', 'county'],
  },
  status: {
    preferred: ['Vendor Day Status', 'Status', 'Submission Status', 'Review Status'],
    hints: ['vendor day status', 'submission status', 'review', 'approval', 'status'],
  },
  eventDate: {
    preferred: ['Vendor Day Date', 'Event Date', 'Activation Date'],
    hints: ['vendor day date', 'event date', 'activation date', 'date'],
  },
  reportDueDate: {
    preferred: ['Report Due Date', 'Due Date', 'Follow-up Due'],
    hints: ['report due', 'due date', 'follow-up due', 'follow up due'],
  },
  reportSubmittedDate: {
    preferred: ['Report Submitted Date', 'Submitted Date', 'Submission Date'],
    hints: ['report submitted', 'submitted date', 'submission date'],
  },
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

const normalizeStatus = (value: string): string => {
  const v = value.trim().toLowerCase();
  if (!v) return 'unknown';

  if (['not started', 'new', 'to schedule', 'unscheduled'].some((k) => v.includes(k))) return 'not_started';
  if (['asap', 'urgent', 'priority'].some((k) => v.includes(k))) return 'asap';
  if (['scheduled', 'booked', 'calendar'].some((k) => v.includes(k))) return 'scheduled';
  if (['in progress', 'in-progress', 'active', 'ongoing'].some((k) => v.includes(k))) return 'in_progress';
  if (['awaiting report', 'awaiting reports', 'report pending', 'pending report'].some((k) => v.includes(k))) return 'awaiting_reports';
  if (['submitted', 'under review'].some((k) => v.includes(k))) return 'submitted';
  if (['done', 'completed', 'complete', 'closed', 'approved'].some((k) => v.includes(k))) return 'done';

  return v.replace(/\s+/g, '_');
};

const includesAny = (value: string, needles: string[]): boolean => needles.some((needle) => value.includes(needle));

const isNeedsScheduling = (status: string): boolean => includesAny(status, ['not_started', 'asap', 'to_schedule', 'unscheduled']);
const isInProgress = (status: string): boolean => includesAny(status, ['in_progress', 'scheduled', 'active', 'ongoing']);
const isAwaitingReports = (status: string): boolean => includesAny(status, ['awaiting_reports', 'report_pending', 'submitted']);
const isDone = (status: string): boolean => includesAny(status, ['done', 'completed', 'closed', 'approved']);

const toIsoDate = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const daysAgo = (iso?: string): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const now = Date.now();
  return Math.floor((now - t) / (1000 * 60 * 60 * 24));
};

const isOverdue = (item: BAOpsItem): boolean => {
  const status = normalizeStatus(item.vendorDayStatus);
  if (isDone(status)) return false;

  const due = item.reportDueDate ? new Date(item.reportDueDate).getTime() : NaN;
  if (!Number.isNaN(due) && due < Date.now()) return true;

  const eventAge = daysAgo(item.eventDate);
  return isAwaitingReports(status) && eventAge !== null && eventAge > 3;
};

const crmToItem = (row: CRMRecord): BAOpsItem => ({
  id: row.id,
  storeName: row.name,
  rep: row.rep,
  city: row.city,
  region: row.region,
  vendorDayStatus: row.vendorDayStatus,
  source: 'crm',
  eventDate: row.lastVendorDayDate || undefined,
  lastEdited: row.lastEdited,
  notionUrl: row.notionUrl,
});

export const loadBAOpsData = async (): Promise<BAOpsData> => {
  const now = new Date().toISOString();

  try {
    const dbMap = await resolveDbMap();
    const crmRows = await loadCRMRecords();

    const crmItems = crmRows.map(crmToItem);

    let submissionItems: BAOpsItem[] = [];
    if (dbMap.vendorSubmissions) {
      const submissions = await queryDatabase(dbMap.vendorSubmissions);
      submissionItems = submissions.map((page) => {
        const props = (page.properties ?? {}) as Record<string, unknown>;
        return {
          id: page.id,
          storeName: findPropertyValue(props, FIELD_MAP.storeName) || getTitle(props),
          rep: findPropertyValue(props, FIELD_MAP.rep) || 'Unassigned',
          city: findPropertyValue(props, FIELD_MAP.city) || '—',
          region: findPropertyValue(props, FIELD_MAP.region) || '—',
          vendorDayStatus: findPropertyValue(props, FIELD_MAP.status) || 'Submitted',
          source: 'vendorSubmissions',
          eventDate: toIsoDate(findPropertyValue(props, FIELD_MAP.eventDate)),
          reportDueDate: toIsoDate(findPropertyValue(props, FIELD_MAP.reportDueDate)),
          reportSubmittedDate: toIsoDate(findPropertyValue(props, FIELD_MAP.reportSubmittedDate)),
          lastEdited: page.last_edited_time || undefined,
          notionUrl: page.url,
        };
      });
    }

    const byStore = new Map<string, BAOpsItem>();
    [...crmItems, ...submissionItems].forEach((item) => {
      const key = item.storeName.trim().toLowerCase() || item.id;
      const existing = byStore.get(key);
      if (!existing) {
        byStore.set(key, item);
        return;
      }

      const existingEdited = existing.lastEdited ? new Date(existing.lastEdited).getTime() : 0;
      const nextEdited = item.lastEdited ? new Date(item.lastEdited).getTime() : 0;
      if (nextEdited >= existingEdited) byStore.set(key, { ...existing, ...item });
    });

    const items = Array.from(byStore.values());

    const needsScheduling = items.filter((item) => isNeedsScheduling(normalizeStatus(item.vendorDayStatus)));
    const inProgress = items.filter((item) => isInProgress(normalizeStatus(item.vendorDayStatus)));
    const awaitingReports = items.filter((item) => isAwaitingReports(normalizeStatus(item.vendorDayStatus)));
    const overdueFollowUps = items.filter(isOverdue);

    return {
      needsScheduling: needsScheduling.sort((a, b) => a.storeName.localeCompare(b.storeName)),
      inProgress: inProgress.sort((a, b) => a.storeName.localeCompare(b.storeName)),
      awaitingReports: awaitingReports.sort((a, b) => a.storeName.localeCompare(b.storeName)),
      overdueFollowUps: overdueFollowUps.sort((a, b) => a.storeName.localeCompare(b.storeName)),
      lastRefreshed: now,
      source: 'api',
      warning: items.length === 0 ? 'No BA ops records found in mapped CRM/Vendor Submissions databases.' : undefined,
    };
  } catch {
    return {
      needsScheduling: [],
      inProgress: [],
      awaitingReports: [],
      overdueFollowUps: [],
      lastRefreshed: now,
      source: 'fallback',
      warning: 'Unable to load BA Ops queues from Notion right now.',
    };
  }
};
