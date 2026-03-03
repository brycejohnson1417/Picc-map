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

  const [territory, crm] = await Promise.allSettled([prewarmTerritoryGeocodeCache(), prewarmLiveCrmCaches()]);

  const body = {
    ok: territory.status === 'fulfilled' || crm.status === 'fulfilled',
    territory:
      territory.status === 'fulfilled'
        ? territory.value
        : { error: territory.reason instanceof Error ? territory.reason.message : 'Territory sync failed' },
    crm:
      crm.status === 'fulfilled'
        ? crm.value
        : { error: crm.reason instanceof Error ? crm.reason.message : 'CRM sync failed' },
    syncedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: body.ok ? 200 : 500,
  });
}
