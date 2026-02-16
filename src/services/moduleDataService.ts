import { MOCK_DISPENSARIES, MOCK_WORK_ORDERS } from '../constants';
import type { DataEnvelope, Dispensary, FinanceMetric, TeamMember, WorkOrder } from '../types';
import { getSheetData } from './sheetsService';
import {
  getTitle,
  isPendingStatus,
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
      const status = readByName(props, ['status']) || 'New';
      const priority = readByName(props, ['priority']) || 'Medium';

      return {
        id: page.id,
        ticketNumber: readByName(props, ['ticket', 'number']) || `WO-${idx + 1000}`,
        title: getTitle(props),
        type: (readByName(props, ['type']) || 'Support Case') as WorkOrder['type'],
        status: (status || 'New') as WorkOrder['status'],
        requesterName: readByName(props, ['requester', 'contact', 'customer']) || 'Unknown',
        priority: (priority === 'High' || priority === 'Low' ? priority : 'Medium') as WorkOrder['priority'],
        description: readByName(props, ['description', 'details', 'summary']) || 'No description provided.',
        dateCreated: readByName(props, ['created', 'date']) || new Date().toISOString().slice(0, 10),
        channel: (readByName(props, ['channel']) || 'Portal') as WorkOrder['channel'],
        sentiment: 'Neutral' as WorkOrder['sentiment'],
        assignee: undefined,
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
