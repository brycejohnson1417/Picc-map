import { GoogleAuth } from 'google-auth-library';
import { sha256 } from './utils';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

interface ServiceAccountConfig {
  client_email: string;
  private_key: string;
}

const loadServiceAccount = (): ServiceAccountConfig => {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable.');
  }

  const parsed = JSON.parse(raw) as Partial<ServiceAccountConfig>;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON missing client_email/private_key.');
  }

  return parsed as ServiceAccountConfig;
};

const getAuthToken = async () => {
  const creds = loadServiceAccount();
  const auth = new GoogleAuth({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key
    },
    scopes: [SHEETS_SCOPE]
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const tokenString = token?.token || token;
  if (!tokenString) {
    throw new Error('Unable to obtain Google access token from service account.');
  }
  return tokenString;
};

export interface SheetValueRequest {
  sheetId: string;
  range: string;
}

export const getSheetValues = async ({ sheetId, range }: SheetValueRequest): Promise<{ range: string; values: string[][] }> => {
  const token = await getAuthToken();
  const encodedRange = encodeURIComponent(range);
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Google Sheets API error ${response.status}: ${text}`);
  }

  const parsed = text ? JSON.parse(text) : { values: [] };
  return {
    range: parsed.range || range,
    values: (parsed.values || []) as string[][]
  };
};

export const hashValues = (values: string[][]): string => {
  return sha256(JSON.stringify(values || []));
};
