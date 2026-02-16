import { MOCK_DISPENSARIES, MOCK_WORK_ORDERS } from '../constants';
import { UserRole, type DataEnvelope, type Dispensary, type FinanceMetric, type TeamMember, type WorkOrder } from '../types';
import { getSheetData } from './sheetsService';
import {
  getTitle,
  isPendingStatus,
  propText,
  queryDatabase,
  readByName,
  readNumberByName,
  resolveDbMap,
} from './notionDataService';

export interface FinanceReportData extends DataEnvelope<FinanceMetric> {
  totals: {
    revenue: number;
    expenses: number;
    net: number;
  };
}

const nowIso = (): string => new Date().toISOString();
const DEFAULT_DATE = (): string => new Date().toISOString().slice(0, 10);

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const findPropByHints = (props: Record<string, unknown>, hints: string[]): unknown => {
  const entries = Object.entries(props);
  if (entries.length === 0) return undefined;

  const normalizedHints = hints.map((hint) => normalizeText(hint)).filter(Boolean);

  for (const hint of normalizedHints) {
    const exact = entries.find(([name]) => normalizeText(name) === hint);
    if (exact) return exact[1];
  }

  for (const hint of normalizedHints) {
    const partial = entries.find(([name]) => {
      const normalizedName = normalizeText(name);
      return normalizedName.includes(hint) || hint.includes(normalizedName);
    });
    if (partial) return partial[1];
  }

  return undefined;
};

const readTextByHints = (props: Record<string, unknown>, hints: string[]): string => {
  const hit = findPropByHints(props, hints);
  if (hit === undefined) return '';
  return propText(hit).trim();
};

const toIsoDate = (raw: string): string => {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const readDateByHints = (props: Record<string, unknown>, hints: string[]): string => {
  const raw = readTextByHints(props, hints);
  if (!raw) return '';
  return toIsoDate(raw);
};

const readBoolByHints = (props: Record<string, unknown>, hints: string[], fallback = false): boolean => {
  const raw = readTextByHints(props, hints);
  if (!raw) return fallback;

  const normalized = normalizeText(raw);
  if (!normalized) return fallback;

  if (['true', 'yes', 'y', '1', 'required', 'require', 'needs sign off', 'needs signoff', 'awaiting sign off', 'awaiting signoff'].includes(normalized)) {
    return true;
  }
  if (['false', 'no', 'n', '0', 'none', 'not required', 'n a', 'na'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const toStatus = (value: string): WorkOrder['status'] => {
  const normalized = normalizeText(value);
  if (!normalized) return 'New';
  if (['archived', 'archive'].some((k) => normalized.includes(k))) return 'Archived';
  if (['completed', 'complete', 'closed', 'resolved', 'signed off'].some((k) => normalized.includes(k))) return 'Completed';
  if (['in progress', 'working', 'active', 'follow up', 'awaiting sign off', 'pending sign off'].some((k) => normalized.includes(k))) {
    return 'In Progress';
  }
  return 'New';
};

const toType = (value: string): WorkOrder['type'] => {
  const normalized = normalizeText(value);
  if (!normalized) return 'Support Case';
  if (normalized.includes('onboarding')) return 'PPP Onboarding';
  if (normalized.includes('proposal')) return 'PPP Proposal';
  if (normalized.includes('hr')) return 'HR Request';
  if (normalized.includes('order')) return 'General Order';
  return 'Support Case';
};

const toPriority = (value: string): WorkOrder['priority'] => {
  const normalized = normalizeText(value);
  if (normalized.includes('high') || normalized.includes('urgent') || normalized.includes('critical')) return 'High';
  if (normalized.includes('low')) return 'Low';
  return 'Medium';
};

const toChannel = (value: string): WorkOrder['channel'] => {
  const normalized = normalizeText(value);
  if (normalized.includes('email')) return 'Email';
  if (normalized.includes('slack')) return 'Slack';
  if (normalized.includes('phone') || normalized.includes('call')) return 'Phone';
  if (normalized.includes('sms') || normalized.includes('text')) return 'SMS';
  if (normalized.includes('instagram') || normalized.includes('ig')) return 'Instagram';
  return 'Portal';
};

const toSentiment = (value: string): WorkOrder['sentiment'] => {
  const normalized = normalizeText(value);
  if (normalized.includes('negative') || normalized.includes('angry') || normalized.includes('frustrated')) return 'Negative';
  if (normalized.includes('positive') || normalized.includes('happy')) return 'Positive';
  return 'Neutral';
};

const toAssigneeRole = (value: string): WorkOrder['assignee'] => {
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  if (normalized.includes('sales ops')) return UserRole.SALES_OPS;
  if (normalized.includes('sales rep')) return UserRole.SALES_REP;
  if (normalized.includes('brand ambassador') || normalized === 'ambassador' || normalized === 'ba') return UserRole.AMBASSADOR;
  if (normalized.includes('finance')) return UserRole.FINANCE;
  if (normalized.includes('platform admin') || normalized === 'admin') return UserRole.ADMIN;
  if (normalized.includes('unassigned')) return 'Unassigned';
  return undefined;
};

export const loadFinanceReportData = async (): Promise<FinanceReportData> => {
  const fallback: FinanceReportData = {
    rows: [],
    totals: { revenue: 0, expenses: 0, net: 0 },
    source: 'fallback',
    warning: 'Finance mapping is missing or no records are available yet.',
    lastRefreshed: nowIso(),
  };

  try {
    const dbMap = await resolveDbMap();
    if (!dbMap.finance) return fallback;

    const results = await queryDatabase(dbMap.finance);
    const rows = results.map((page) => {
      const props = page.properties ?? {};
      const category = readByName(props, ['category', 'type']) || 'General';
      const amount = readNumberByName(props, ['amount', 'value', 'total', 'revenue', 'expense']) ?? 0;
      return {
        id: page.id,
        name: getTitle(props),
        category,
        amount,
        status: readByName(props, ['status', 'stage']) || 'Draft',
        period: readByName(props, ['period', 'month', 'quarter']) || 'Unspecified',
        lastEdited: page.last_edited_time || '',
      };
    });

    const revenue = rows
      .filter((row) => row.category.toLowerCase().includes('revenue') || row.category.toLowerCase().includes('sales'))
      .reduce((sum, row) => sum + row.amount, 0);

    const expenses = rows
      .filter((row) => row.category.toLowerCase().includes('expense') || row.category.toLowerCase().includes('cost'))
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      rows,
      totals: {
        revenue,
        expenses,
        net: revenue - expenses,
      },
      source: 'api',
      lastRefreshed: nowIso(),
      warning: rows.length === 0 ? 'Finance database is connected but no rows were returned.' : undefined,
    };
  } catch {
    return fallback;
  }
};

export const loadTeamDirectoryData = async (): Promise<DataEnvelope<TeamMember>> => {
  try {
    const dbMap = await resolveDbMap();
    if (!dbMap.team) {
      return {
        rows: [],
        source: 'fallback',
        warning: 'Map Team Directory database in Settings to load reps and ambassadors.',
        lastRefreshed: nowIso(),
      };
    }

    const results = await queryDatabase(dbMap.team);
    const rows = results.map((page) => {
      const props = page.properties ?? {};
      return {
        id: page.id,
        name: getTitle(props),
        role: readByName(props, ['role', 'title']) || 'Unknown',
        region: readByName(props, ['region', 'territory', 'location']) || '—',
        status: readByName(props, ['status', 'active']) || '—',
        email: readByName(props, ['email']) || '—',
        phone: readByName(props, ['phone', 'mobile']) || '—',
        lastEdited: page.last_edited_time || '',
      };
    });

    return {
      rows,
      source: 'api',
      warning: rows.length === 0 ? 'Team database is connected but has no rows yet.' : undefined,
      lastRefreshed: nowIso(),
    };
  } catch {
    return {
      rows: [],
      source: 'fallback',
      warning: 'Unable to load Team Directory from Notion right now.',
      lastRefreshed: nowIso(),
    };
  }
};

export const loadServiceCenterData = async (): Promise<DataEnvelope<WorkOrder>> => {
  try {
    const dbMap = await resolveDbMap();
    if (!dbMap.workOrders) {
      return {
        rows: MOCK_WORK_ORDERS,
        source: 'fallback',
        warning: 'Work Orders mapping missing. Showing local fallback tickets.',
        lastRefreshed: nowIso(),
      };
    }

    const results = await queryDatabase(dbMap.workOrders);
    const rows = results.map((page, idx) => {
      const props = page.properties ?? {};
      const statusRaw = readTextByHints(props, ['status', 'workflow status', 'state', 'ticket status']);
      const priorityRaw = readTextByHints(props, ['priority', 'urgency', 'severity']);
      const assigneeName = readTextByHints(props, ['assignee', 'assigned to', 'owner', 'agent', 'rep']);
      const followUpReason = readTextByHints(props, ['follow up reason', 'follow-up reason', 'follow up', 'next action', 'blocker']) || undefined;
      const dueDate = readDateByHints(props, ['due date', 'follow up due', 'follow-up due', 'deadline', 'target date', 'eta']) || undefined;
      const signOffBy = readTextByHints(props, ['sign off by', 'signed off by', 'approver', 'approved by']) || undefined;
      const awaitingSignOffByStatus = normalizeText(statusRaw).includes('awaiting sign off') || normalizeText(statusRaw).includes('pending sign off');
      const requiresSignOff = readBoolByHints(
        props,
        ['requires sign off', 'requires signoff', 'needs sign off', 'needs signoff', 'sign off required', 'signoff required'],
        false,
      );
      const signedOff = readBoolByHints(props, ['signed off', 'sign off complete', 'signoff complete', 'approval complete'], false);
      const inferredSignedOff = signedOff || normalizeText(statusRaw).includes('signed off');
      const sentimentRaw = readTextByHints(props, ['sentiment', 'tone', 'customer sentiment']);
      const requesterName = readTextByHints(props, ['requester', 'requestor', 'submitted by', 'contact', 'customer']) || 'Unknown';
      const createdDate =
        readDateByHints(props, ['date created', 'created', 'opened', 'request date', 'submitted']) ||
        toIsoDate(page.last_edited_time || '') ||
        DEFAULT_DATE();
      const notionUrl = readTextByHints(props, ['notion url', 'record url', 'page url', 'ticket url']) || page.url || undefined;

      return {
        id: page.id,
        ticketNumber: readTextByHints(props, ['ticket number', 'ticket', 'work order', 'wo number', 'case number']) || `WO-${idx + 1000}`,
        title: getTitle(props),
        type: toType(readTextByHints(props, ['type', 'work order type', 'category'])),
        status: toStatus(statusRaw),
        assignee: toAssigneeRole(assigneeName),
        assigneeName: assigneeName || undefined,
        dispensaryId: readTextByHints(props, ['dispensary id', 'store id', 'account id']) || undefined,
        dispensaryName: readTextByHints(props, ['dispensary', 'store name', 'account', 'customer name']) || undefined,
        requesterName,
        priority: toPriority(priorityRaw),
        description: readTextByHints(props, ['description', 'details', 'summary', 'issue']) || 'No description provided.',
        dateCreated: createdDate,
        dueDate,
        followUpReason,
        requiresSignOff: requiresSignOff || awaitingSignOffByStatus || Boolean(signOffBy),
        signedOff: inferredSignedOff,
        signOffBy,
        notionUrl,
        channel: toChannel(readTextByHints(props, ['channel', 'source', 'intake channel'])),
        sentiment: toSentiment(sentimentRaw),
        aiSummary: readTextByHints(props, ['ai summary', 'summary', 'internal summary']) || undefined,
      };
    });

    return {
      rows,
      source: 'api',
      warning: rows.length === 0 ? 'No work orders found in connected database.' : undefined,
      lastRefreshed: nowIso(),
    };
  } catch {
    return {
      rows: MOCK_WORK_ORDERS,
      source: 'fallback',
      warning: 'Unable to load live Work Orders. Showing fallback data.',
      lastRefreshed: nowIso(),
    };
  }
};

export const loadPPPData = async (): Promise<DataEnvelope<Dispensary>> => {
  try {
    const dbMap = await resolveDbMap();
    if (dbMap.crm) {
      const results = await queryDatabase(dbMap.crm);
      const rows = results.map((page) => {
        const props = page.properties ?? {};
        const status = readByName(props, ['ppp status', 'onboarding status', 'status']);
        return {
          id: page.id,
          name: getTitle(props),
          pppStatus: (status || 'Not Started') as Dispensary['pppStatus'],
          location: readByName(props, ['city', 'location', 'address']) || '—',
          contactPerson: readByName(props, ['contact', 'owner', 'requester']) || 'Unknown',
          salesRep: readByName(props, ['rep', 'ambassador']) || undefined,
          creditStatus: isPendingStatus(status) ? 'Pending' : 'Connected',
        };
      });

      if (rows.length > 0) {
        return {
          rows,
          source: 'api',
          lastRefreshed: nowIso(),
        };
      }
    }

    const sheetsRows = await getSheetData();
    if (sheetsRows.length > 0) {
      return {
        rows: sheetsRows,
        source: 'api',
        warning: 'Using Google Sheets as PPP source because CRM status fields were unavailable.',
        lastRefreshed: nowIso(),
      };
    }

    return {
      rows: MOCK_DISPENSARIES,
      source: 'fallback',
      warning: 'PPP live source not configured. Showing local fallback list.',
      lastRefreshed: nowIso(),
    };
  } catch {
    return {
      rows: MOCK_DISPENSARIES,
      source: 'fallback',
      warning: 'Unable to load PPP data from live sources.',
      lastRefreshed: nowIso(),
    };
  }
};
