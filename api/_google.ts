import { JWT, OAuth2Client, type TokenPayload } from 'google-auth-library';

type ServiceAccountJson = {
  client_email?: string;
  private_key?: string;
};

const SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const parseServiceAccount = (): ServiceAccountJson | null => {
  const raw = first(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ServiceAccountJson;
    if (!parsed.client_email || !parsed.private_key) return null;

    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
    };
  } catch {
    return null;
  }
};

export const getGoogleClientId = (): string | null =>
  process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || null;

export const getGoogleAllowedDomain = (): string | null =>
  process.env.GOOGLE_OAUTH_ALLOWED_DOMAIN || null;

export const verifyGoogleIdToken = async (idToken: string): Promise<TokenPayload | null> => {
  const clientId = getGoogleClientId();
  if (!clientId) return null;

  const client = new OAuth2Client(clientId);
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });

    return ticket.getPayload() || null;
  } catch {
    return null;
  }
};

export const sheetsConfigured = (): boolean => Boolean(parseServiceAccount());

const getSheetsAccessToken = async (): Promise<string> => {
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount?.client_email || !serviceAccount.private_key) {
    throw new Error('Google Sheets service account is not configured.');
  }

  const jwt = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: SHEETS_SCOPES,
  });

  const token = await jwt.getAccessToken();
  const accessToken = typeof token === 'string' ? token : token?.token;

  if (!accessToken) {
    throw new Error('Unable to obtain Google Sheets access token.');
  }

  return accessToken;
};

export const sheetsFetch = async (
  path: string,
  query: Record<string, string | string[] | undefined> = {},
): Promise<Response> => {
  const token = await getSheetsAccessToken();
  const url = new URL(`https://sheets.googleapis.com/v4/${path}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
      return;
    }
    url.searchParams.set(key, value);
  });

  return fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
