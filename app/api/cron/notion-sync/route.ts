import { NextResponse } from 'next/server';
import { prewarmLiveCrmCaches } from '@/lib/server/notion-live-crm';
import { prewarmTerritoryGeocodeCache } from '@/lib/server/notion-territory';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request) {
  const cronHeader = request.headers.get('x-vercel-cron');
  if (cronHeader) {
    return true;
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get('authorization') ?? '';
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const territory = await prewarmTerritoryGeocodeCache().then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  const crm = await prewarmLiveCrmCaches().then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

  const body = {
    ok: territory.ok || crm.ok,
    territory: territory.ok ? territory.value : { error: territory.error instanceof Error ? territory.error.message : 'Territory sync failed' },
    crm: crm.ok ? crm.value : { error: crm.error instanceof Error ? crm.error.message : 'CRM sync failed' },
    syncedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: body.ok ? 200 : 500,
  });
}
