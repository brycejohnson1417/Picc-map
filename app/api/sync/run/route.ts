import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/api-guard';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'FINANCE']);
  if ('error' in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const syncModule = body.module || 'all';

  const integrations = await prisma.integrationConnection.findMany({ where: { orgId: ctx.orgId, enabled: true } });

  const runs = await Promise.all(
    integrations.map((integration) =>
      prisma.syncRun.create({
        data: {
          orgId: ctx.orgId,
          integrationId: integration.id,
          module: syncModule,
          status: 'RUNNING',
          recordsIn: 0,
        },
      }),
    ),
  );

  return NextResponse.json({ started: runs.length, module: syncModule });
}
