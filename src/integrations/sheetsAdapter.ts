import { Dispensary, PPPStatus } from '../types';

interface SheetsParseRules {
  headerRow?: number;
  fallbackSourceColumns?: string[];
  idPrefix?: string;
}

type ModuleId = 'wiki' | 'ppp_onboarding' | 'work_orders' | 'crm' | 'vendor_days';

const normalizeStatus = (status: string): PPPStatus => {
  const normalized = status.trim();
  const allowed: PPPStatus[] = [
    'Not Started',
    'Invited',
    'Onboarding Pending',
    'API Key Needed',
    'Approved & Connected'
  ];
  return (allowed.includes(normalized as PPPStatus) ? normalized : 'Not Started') as PPPStatus;
};

const parseIntSafe = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.round(parsed);
};

export interface ParsedSheetItem {
  id: string;
  canonical: Record<string, unknown>;
}

export const parseSheetRows = (
  module: ModuleId,
  rows: string[][],
  fieldMap: Record<string, string>,
  transformRules: SheetsParseRules = {},
  sourceVersion?: string
): ParsedSheetItem[] => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  if (module === 'ppp_onboarding') {
    const headerIndex = transformRules.headerRow || 0;
    const header = rows[headerIndex] || [];

    const sourceHeaders = header.reduce<Record<string, string>>((acc, label, idx) => {
      if (typeof label === 'string' && label.trim()) {
        acc[label.trim()] = idx.toString();
      }
      return acc;
    }, {});

    const mappedHeaders = sourceHeaders;
    const getValueByColumn = (record: string[], canonicalKey: string): string => {
      const headerName = fieldMap[canonicalKey];
      if (!headerName) {
        return '';
      }
      const idxFromHeader = mappedHeaders[headerName];
      if (idxFromHeader !== undefined) {
        return (record[Number(idxFromHeader)] || '').toString();
      }
      const fallbackColumns = transformRules.fallbackSourceColumns || [];
      const fallbackIndex = fallbackColumns.indexOf(headerName);
      if (fallbackIndex >= 0 && headerIndex + fallbackIndex + 1 < rows[headerIndex + 1]?.length) {
        return (record[fallbackIndex] || '').toString();
      }
      return '';
    };

    const dataRows = rows.slice(headerIndex + 1);
    return dataRows
      .filter((row) => row.some(Boolean))
      .map((row, idx) => {
        const id = String(row[0] || `${transformRules.idPrefix || 'sheet'}-${idx}`);
        return {
          id,
          canonical: {
            id,
            name: getValueByColumn(row, 'name') || id,
            pppStatus: normalizeStatus(getValueByColumn(row, 'pppStatus')),
            location: getValueByColumn(row, 'location'),
            contactPerson: getValueByColumn(row, 'contactPerson'),
            licenseNumber: getValueByColumn(row, 'licenseNumber') || undefined,
            totalOrders: parseIntSafe(getValueByColumn(row, 'totalOrders')),
            totalOrderedAmount: getValueByColumn(row, 'totalOrderedAmount') || undefined,
            lastOrderDate: getValueByColumn(row, 'lastOrderDate') || undefined
          },
          sourceVersion
        } as ParsedSheetItem;
      })
      .filter((item): item is ParsedSheetItem => Boolean(item.canonical.name));
  }

  // Generic module fallback for sheet-backed modules
  return rows
    .slice(1)
    .filter((row) => row.some(Boolean))
    .map((row, idx) => {
      const id = String(row[0] || `${transformRules.idPrefix || 'sheet'}-${idx}`);
      return {
        id,
        canonical: {
          id,
          value: row.join(' | '),
          source: 'sheets'
        } as Record<string, unknown>,
        sourceVersion
      };
    });
};

export const normalizeDispensaries = (items: ParsedSheetItem[]): Dispensary[] => {
  return items.map((item) => {
    const canonical = item.canonical as Partial<Dispensary>;
    const toString = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value : undefined);

    return {
      id: item.id,
      name: toString(canonical.name) || 'Unknown',
      pppStatus: (toString(canonical.pppStatus) as Dispensary['pppStatus']) || 'Not Started',
      location: toString(canonical.location) || '',
      contactPerson: toString(canonical.contactPerson) || '',
      licenseNumber: canonical.licenseNumber,
      totalOrders: typeof canonical.totalOrders === 'number' ? canonical.totalOrders : undefined,
      totalOrderedAmount: canonical.totalOrderedAmount,
      lastOrderDate: canonical.lastOrderDate
    };
  });
};
