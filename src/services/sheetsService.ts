import { Dispensary } from '../types';

export type SheetBatchRequest = {
  ranges: string[];
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
  dateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING';
};

const getSheetId = (): string => localStorage.getItem('google_sheet_id') || '';
const getDefaultRange = (): string => localStorage.getItem('google_sheet_range') || 'A1:H1000';

export const getSheetData = async (): Promise<Dispensary[]> => {
  const sheetId = getSheetId();
  const range = getDefaultRange();

  if (!sheetId) {
    console.log('Sheet ID not configured');
    return [];
  }

  try {
    const response = await fetch(
      `/api/sheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,
      {
        method: 'GET',
      },
    );

    if (!response.ok) {
      throw new Error(`Sheet API Error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.values || data.values.length < 2) {
      return [];
    }

    // Parse sheet rows into Dispensary objects
    // First row is headers
    return data.values.slice(1).map((row: unknown[], idx: number) => {
      const values = Array.isArray(row) ? row : [];
      return {
        id: `sheet-${idx}`,
        name: (values[0] as string) || 'Unknown',
        pppStatus: ((values[1] as string) || 'Not Started') as Dispensary['pppStatus'],
        location: (values[2] as string) || '',
        contactPerson: (values[3] as string) || '',
        licenseNumber: (values[4] as string) || undefined,
        totalOrders: values[5] ? parseInt(String(values[5]), 10) : undefined,
        totalOrderedAmount: (values[6] as string) || undefined,
        lastOrderDate: (values[7] as string) || undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return [];
  }
};

export const fetchSheetBatch = async (request: SheetBatchRequest): Promise<Record<string, unknown[]>> => {
  const sheetId = getSheetId();
  if (!sheetId || request.ranges.length === 0) return {};

  const response = await fetch(`/api/sheets/${encodeURIComponent(sheetId)}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Sheet batch API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const valueRanges = Array.isArray(data.valueRanges) ? data.valueRanges : [];

  return valueRanges.reduce((acc: Record<string, unknown[]>, item: { range?: string; values?: unknown[] }) => {
    if (item.range) acc[item.range] = item.values || [];
    return acc;
  }, {});
};

export const fetchSheetMeta = async (): Promise<{ title: string; tabs: string[] } | null> => {
  const sheetId = getSheetId();
  if (!sheetId) return null;

  const response = await fetch(`/api/sheets/${encodeURIComponent(sheetId)}/meta`);
  if (!response.ok) {
    throw new Error(`Sheet meta API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const title = data?.properties?.title || 'Untitled Sheet';
  const tabs = Array.isArray(data?.sheets)
    ? data.sheets
        .map((sheet: { properties?: { title?: string } }) => sheet.properties?.title)
        .filter((name: unknown): name is string => typeof name === 'string' && name.length > 0)
    : [];

  return { title, tabs };
};
