import { Dispensary, PPPStatus } from '../types';

export const getSheetData = async (): Promise<Dispensary[]> => {
  const sheetId = localStorage.getItem('google_sheet_id');
  
  if (!sheetId) {
    return [];
  }

  // Assuming 'Sheet1' or the first tab. Range A1:AZ1000 covers typical data size.
  const range = 'A1:AZ1000'; 

  try {
    const response = await fetch(`/api/sheets/${sheetId}/values/${range}`, {
      method: 'GET',
      headers: {
        'X-Google-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Try to get specific error from Google API via Proxy
      const errJson = await response.json().catch(() => null);
      const errMsg = errJson?.error?.message || response.statusText;
      
      if (response.status === 403) {
          throw new Error("Access Denied: Is the sheet shared with 'Anyone with the link'?");
      }
      throw new Error(`Sheets API Error (${response.status}): ${errMsg}`);
    }

    const json = await response.json();
    const rows = json.values;

    if (!rows || rows.length === 0) return [];

    // Parse Headers to find indices dynamically
    const headers = rows[0].map((h: string) => h.trim().toLowerCase());
    
    // Helper to find index by partial match
    const idx = (key: string) => headers.findIndex((h: string) => h.includes(key.toLowerCase()));

    // Map specific columns from your CSV structure
    const nameIdx = idx('dispensary name');
    const licenseIdx = idx('license number');
    const addressIdx = idx('address');
    const pocNameIdx = idx('nabis poc name');
    const pocEmailIdx = idx('nabis poc email');
    const pocPhoneIdx = idx('nabis poc phone');
    const repIdx = idx('rep listed on latest order');
    const totalOrdersIdx = idx('total orders');
    const totalAmountIdx = idx('total ordered (amount)');
    const lastOrderDateIdx = idx('last order created date');
    const creditStatusIdx = idx('credit status');
    const whalesyncIdIdx = idx('whalesync id');

    // Remove header row and map
    return rows.slice(1).map((row: any[]) => {
      // Determine PPP Status based on logic
      let pppStatus: PPPStatus = 'Not Started';
      
      const orders = parseInt(row[totalOrdersIdx] || '0');
      const credit = row[creditStatusIdx];

      if (orders > 0) {
        pppStatus = 'Approved & Connected';
      } else if (credit === 'Payment Required' || credit === 'Hold') {
        pppStatus = 'API Key Needed'; // Heuristic: payment issues often block onboarding
      } else if (row[repIdx]) {
        pppStatus = 'Invited';
      }

      return {
        id: row[whalesyncIdIdx] || Math.random().toString(36).substr(2, 9),
        name: row[nameIdx] || 'Unknown Dispensary',
        licenseNumber: row[licenseIdx],
        location: row[addressIdx] || 'Unknown Location',
        contactPerson: row[pocNameIdx] || 'No Contact',
        email: row[pocEmailIdx],
        phone: row[pocPhoneIdx],
        salesRep: row[repIdx],
        totalOrders: orders,
        totalOrderedAmount: row[totalAmountIdx],
        lastOrderDate: row[lastOrderDateIdx],
        creditStatus: credit,
        pppStatus: pppStatus
      };
    }).filter((d: Dispensary) => d.name); // Filter out empty rows

  } catch (error) {
    console.error("Failed to fetch sheet data", error);
    throw error;
  }
};
