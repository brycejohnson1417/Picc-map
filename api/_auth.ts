import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

const COOKIE_NAME = 'picc_auth';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

type SessionPayload = {
  iat: number;
  exp: number;
};

const base64url = (input: string): string => Buffer.from(input).toString('base64url');

const sign = (payloadB64: string, secret: string): string =>
  crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

const getSecret = (): string | null => {
  const secret = process.env.APP_AUTH_SECRET || process.env.AUTH_SECRET || process.env.VERCEL_TOKEN;
  return secret || null;
};

const getPassword = (): string | null =>
  process.env.APP_AUTH_PASSWORD || process.env.AUTH_PASSWORD || null;

const parseCookies = (req: VercelRequest): Record<string, string> => {
  const raw = req.headers.cookie || '';
  const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
  const out: Record<string, string> = {};
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx > 0) out[p.slice(0, idx)] = decodeURIComponent(p.slice(idx + 1));
  }
  return out;
};

const sessionCookie = (token: string, maxAge: number): string =>
  `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export const clearSession = (res: VercelResponse): void => {
  res.setHeader('Set-Cookie', sessionCookie('', 0));
};

export const createSession = (res: VercelResponse): void => {
  const secret = getSecret();
  if (!secret) throw new Error('Missing APP_AUTH_SECRET env var');

  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { iat: now, exp: now + SESSION_TTL_SECONDS };
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadB64, secret);
  const token = `${payloadB64}.${signature}`;

  res.setHeader('Set-Cookie', sessionCookie(token, SESSION_TTL_SECONDS));
};

export const validatePassword = (candidate: string): boolean => {
  const expected = getPassword();
  if (!expected) return false;
  return candidate.trim() === expected.trim();
};

export const requireAuth = (req: VercelRequest, res: VercelResponse): boolean => {
  const secret = getSecret();
  if (!secret) {
    res.status(500).json({ error: 'Server auth misconfiguration: missing APP_AUTH_SECRET' });
    return false;
  }

  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token || !token.includes('.')) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  const [payloadB64, sig] = token.split('.');
  const expectedSig = sign(payloadB64, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      res.status(401).json({ error: 'Session expired' });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
};

export const authConfigured = (): boolean => Boolean(getPassword() && getSecret());
