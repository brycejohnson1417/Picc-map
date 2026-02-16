import {
  getTitle,
  isClosedStatus,
  isPendingStatus,
  queryDatabase,
  readByName,
  resolveDbMap,
} from './notionDataService';

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

export const loadCommandCenterMetrics = async (): Promise<CommandCenterMetrics> => {
  try {
    const dbMap = await resolveDbMap();

    const [crm, workOrders, submissions, inventory, wiki] = await Promise.all([
      queryDatabase(dbMap.crm),
      queryDatabase(dbMap.workOrders),
      queryDatabase(dbMap.vendorSubmissions),
      queryDatabase(dbMap.inventory),
      queryDatabase(dbMap.wiki),
    ]);

    let customers = 0;
    let leads = 0;
    crm.forEach((page) => {
      const props = page.properties ?? {};
      const status = readByName(props, ['account status', 'status']).toLowerCase();
      if (status.includes('customer')) customers += 1;
      if (status.includes('lead')) leads += 1;
    });

    let openWorkOrders = 0;
    workOrders.forEach((page) => {
      const props = page.properties ?? {};
      const status = readByName(props, ['status']);
      if (!isClosedStatus(status)) openWorkOrders += 1;
    });

    let pendingVendorSubmissions = 0;
    submissions.forEach((page) => {
      const props = page.properties ?? {};
      const status = readByName(props, ['status', 'review', 'approval']);
      if (isPendingStatus(status)) pendingVendorSubmissions += 1;
    });

    let activeInventorySkus = 0;
    inventory.forEach((page) => {
      const props = page.properties ?? {};
      const active = readByName(props, ['active', 'is_active', 'status']).toLowerCase();
      if (!active || active === 'true' || active.includes('active')) activeInventorySkus += 1;
    });

    const updates = [...crm, ...workOrders, ...submissions, ...wiki]
      .map((page) => ({
        title: getTitle(page.properties ?? {}),
        source:
          crm.includes(page) ? 'CRM' : workOrders.includes(page) ? 'Work Orders' : submissions.includes(page) ? 'Vendor Submissions' : 'Wiki',
        lastEdited: page.last_edited_time || '',
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
