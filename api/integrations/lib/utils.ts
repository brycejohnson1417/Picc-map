import crypto from 'crypto';

export const isServer = typeof window === 'undefined';

export const nowIso = (): string => new Date().toISOString();

export const newId = (prefix?: string): string => {
  const base = crypto.randomUUID();
  return prefix ? `${prefix}-${base}` : base;
};

export const sha256 = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

export const pick = <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const output = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (obj[key] !== undefined) {
      output[key] = obj[key];
    }
  });
  return output;
};

export const parseJson = (value: string | null): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

export const asString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

export const ensureBoolean = (value: unknown): boolean => Boolean(value);
