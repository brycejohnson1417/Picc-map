import type { DbMappingKey } from '../services/notionDataService';

export const PICC_DEFAULT_DB_MAP: Partial<Record<DbMappingKey, string>> = {
  crm: '267a86d9-9998-8078-adca-c47c306ab8ba',
  wiki: '231a86d9-9998-8047-8dc4-f857570e9cef',
  workOrders: '2cba86d9-9998-8199-9c1b-c215e8a8e997',
  vendorSubmissions: 'bf5e244b-dd38-4d63-92aa-9ed672af4973',
  inventory: '2f7a86d9-9998-80f7-b308-c87bc9f97650',
  finance: 'd59ef3af-e5bd-42f6-bad0-f083dcd16a75',
  team: 'd8f838f5-5875-45e2-8e71-30cbbe8ed2c1',
};

export const PICC_LOCKED_MODE = true;
