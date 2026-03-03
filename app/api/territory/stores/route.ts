import { NextResponse } from 'next/server';
import { requireTerritoryApiAccess } from '@/lib/auth/territory-access';
import { loadTerritoryStores } from '@/lib/server/notion-territory';

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
  const refresh = searchParams.get('refresh') === '1';

  try {
    const payload = await loadTerritoryStores({
      statuses,
      reps,
      query: q,
      refresh,
    });

    return NextResponse.json(payload, {
      headers: {
        'X-Territory-Data-Source': 'notion-live',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Territory store fetch failed';
    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
        headers: {
          'X-Territory-Data-Source': 'notion-live',
        },
      },
    );
  }
}
