import { Dispensary } from '../types';

export const getSheetData = async (): Promise<Dispensary[]> => {
  const sheetId = localStorage.getItem('google_sheet_id');
  const apiKey = localStorage.getItem('google_api_key');

  if (!sheetId || !apiKey) {
    console.log('Sheet credentials not configured');
    return [];
  }

  try {
    const response = await fetch(`/api/sheets/${sheetId}/values/A1:H1000`, {
      method: 'GET',
      headers: {
        'X-Google-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Sheet API Error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.values || data.values.length < 2) {
      return [];
    }

    // Parse sheet rows into Dispensary objects
    // First row is headers
    return data.values.slice(1).map((row: any[], idx: number) => ({
      id: `sheet-${idx}`,
      name: row[0] || 'Unknown',
      pppStatus: row[1] || 'Not Started',
      location: row[2] || '',
      contactPerson: row[3] || '',
      licenseNumber: row[4] || undefined,
      totalOrders: row[5] ? parseInt(row[5]) : undefined,
      totalOrderedAmount: row[6] || undefined,
      lastOrderDate: row[7] || undefined,
    }));
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return [];
  }
};
