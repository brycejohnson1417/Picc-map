import { getTitle, queryDatabase, readByName, resolveDbMap } from './notionDataService';

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

export const loadCRMRecords = async (): Promise<CRMRecord[]> => {
  const dbMap = await resolveDbMap();
  if (!dbMap.crm) return [];

  const results = await queryDatabase(dbMap.crm);

  return results.map((page) => {
    const props = page.properties ?? {};
    return {
      id: page.id,
      name: getTitle(props),
      accountStatus: readByName(props, ['account status', 'status']),
      vendorDayStatus: readByName(props, ['vendor day status', 'vendor day']),
      city: readByName(props, ['city', 'location', 'address']),
      rep: readByName(props, ['rep', 'ambassador', 'owner']),
      lastEdited: page.last_edited_time || '',
      notionUrl: page.url,
    };
  });
};
