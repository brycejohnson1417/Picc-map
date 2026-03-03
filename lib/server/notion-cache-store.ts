import 'server-only';

import { prisma } from '@/lib/db/prisma';

let snapshotTableEnsured = false;

export interface NotionCacheSnapshot<T> {
  key: string;
  payload: T;
  recordsRead: number;
  unresolvedLocationCount: number;
  lastEditedMax: string | null;
  syncedAt: string;
}

interface SnapshotRow {
  key: string;
  payload: unknown;
  recordsRead: number;
  unresolvedLocationCount: number;
  lastEditedMax: Date | string | null;
  syncedAt: Date | string;
}

function asIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function isDuplicateCreateError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('NotionCacheSnapshot') &&
    (error.message.includes('already exists') || error.message.includes('Code: `23505`'))
  );
}

export async function ensureNotionCacheSnapshotTable() {
  if (snapshotTableEnsured) {
    return;
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "NotionCacheSnapshot" (
        "key" TEXT NOT NULL,
        "payload" JSONB NOT NULL,
        "recordsRead" INTEGER NOT NULL DEFAULT 0,
        "unresolvedLocationCount" INTEGER NOT NULL DEFAULT 0,
        "lastEditedMax" TIMESTAMPTZ,
        "syncedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "NotionCacheSnapshot_pkey" PRIMARY KEY ("key")
      )
    `);
  } catch (error) {
    if (!isDuplicateCreateError(error)) {
      throw error;
    }
  }

  snapshotTableEnsured = true;
}

export async function readNotionCacheSnapshot<T>(key: string): Promise<NotionCacheSnapshot<T> | null> {
  await ensureNotionCacheSnapshotTable();

  const rows = await prisma.$queryRaw<SnapshotRow[]>`
    SELECT "key", "payload", "recordsRead", "unresolvedLocationCount", "lastEditedMax", "syncedAt"
    FROM "NotionCacheSnapshot"
    WHERE "key" = ${key}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    key: row.key,
    payload: row.payload as T,
    recordsRead: Number(row.recordsRead ?? 0),
    unresolvedLocationCount: Number(row.unresolvedLocationCount ?? 0),
    lastEditedMax: asIsoString(row.lastEditedMax),
    syncedAt: asIsoString(row.syncedAt) ?? new Date().toISOString(),
  };
}

export async function writeNotionCacheSnapshot<T>(input: {
  key: string;
  payload: T;
  recordsRead: number;
  unresolvedLocationCount?: number;
  lastEditedMax?: string | null;
}) {
  await ensureNotionCacheSnapshotTable();

  const lastEditedMaxDate = input.lastEditedMax ? new Date(input.lastEditedMax) : null;

  await prisma.$executeRaw`
    INSERT INTO "NotionCacheSnapshot" (
      "key",
      "payload",
      "recordsRead",
      "unresolvedLocationCount",
      "lastEditedMax",
      "syncedAt",
      "updatedAt"
    )
    VALUES (
      ${input.key},
      ${JSON.stringify(input.payload)}::jsonb,
      ${Math.max(0, Math.trunc(input.recordsRead))},
      ${Math.max(0, Math.trunc(input.unresolvedLocationCount ?? 0))},
      ${lastEditedMaxDate},
      NOW(),
      NOW()
    )
    ON CONFLICT ("key")
    DO UPDATE SET
      "payload" = EXCLUDED."payload",
      "recordsRead" = EXCLUDED."recordsRead",
      "unresolvedLocationCount" = EXCLUDED."unresolvedLocationCount",
      "lastEditedMax" = EXCLUDED."lastEditedMax",
      "syncedAt" = NOW(),
      "updatedAt" = NOW()
  `;
}

export function isSnapshotStale(syncedAt: string | null | undefined, ttlMinutes: number) {
  if (!syncedAt) {
    return true;
  }
  const syncedAtMs = Date.parse(syncedAt);
  if (!Number.isFinite(syncedAtMs)) {
    return true;
  }

  const ttlMs = Math.max(1, ttlMinutes) * 60_000;
  return Date.now() - syncedAtMs > ttlMs;
}

export function getSyncTtlMinutes(defaultMinutes: number) {
  const raw = process.env.NOTION_SYNC_TTL_MINUTES?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return defaultMinutes;
}
