import { NextResponse } from 'next/server';
import { requireTerritoryApiAccess } from '@/lib/auth/territory-access';
import { prisma as db } from '@/lib/db/prisma';
import { colorForStatus, normalizeStatus } from '@/lib/territory/types';
import type { TerritoryStorePin, TerritoryStoresResponse } from '@/lib/territory/types';

export const dynamic = 'force-dynamic';

function readMultiParam(searchParams: URLSearchParams, key: string) {
  return searchParams
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const access = await requireTerritoryApiAccess();
  if ('error' in access) {
    return access.error;
  }

  const { searchParams } = new URL(request.url);
  const statuses = readMultiParam(searchParams, 'status');
  const reps = readMultiParam(searchParams, 'rep');
  const q = searchParams.get('q')?.trim() ?? '';

  try {
    // Load directly from the pre-synced Neon database — instant, no Notion API calls
    const accounts = await db.account.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        licenseNumber: true,
        address1: true,
        city: true,
        state: true,
        zipcode: true,
        phone: true,
        status: true,
        latitude: true,
        longitude: true,
        lastSyncedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    // Transform database accounts into TerritoryStorePin format
    let stores: TerritoryStorePin[] = accounts
      .filter((a) => a.latitude !== null && a.longitude !== null)
      .map((account) => ({
        id: account.id,
        notionPageId: account.id,
        name: account.name,
        status: account.status,
        statusKey: normalizeStatus(account.status),
        statusColor: colorForStatus(account.status),
        repNames: [],
        repEmails: [],
        lat: account.latitude!,
        lng: account.longitude!,
        locationLabel: account.name,
        locationAddress: [account.address1, account.city, account.state, account.zipcode].filter(Boolean).join(', '),
        locationSource: 'nominatim-cache' as const,
        lastEditedTime: account.lastSyncedAt?.toISOString() ?? new Date().toISOString(),
        licenseNumber: account.licenseNumber,
        city: account.city,
        state: account.state,
        daysOverdue: null,
      }));

    // Apply filters
    if (statuses.length > 0) {
      const statusSet = new Set(statuses.map((s) => normalizeStatus(s)));
      stores = stores.filter((pin) => statusSet.has(pin.statusKey));
    }

    if (q) {
      const lowerQ = q.toLowerCase();
      stores = stores.filter((pin) =>
        pin.name.toLowerCase().includes(lowerQ) ||
        (pin.licenseNumber?.toLowerCase().includes(lowerQ)) ||
        (pin.city?.toLowerCase().includes(lowerQ))
      );
    }

    // Build filter counts
    const statusCounts = new Map<string, number>();
    for (const pin of stores) {
      statusCounts.set(pin.status, (statusCounts.get(pin.status) ?? 0) + 1);
    }

    const payload: TerritoryStoresResponse = {
      stores,
      filters: {
        statuses: [...statusCounts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value)),
        reps: [],
      },
      meta: {
        dataSource: 'notion-live-cache',
        lastEditedMax: null,
        recordsRead: accounts.length,
        unresolvedLocationCount: 0,
        geocodedThisRequest: 0,
        syncedAt: new Date().toISOString(),
        stale: false,
        syncing: false,
        syncError: null,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Territory store fetch failed';
    console.error('territory_stores_error', { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

