import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/api-guard';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const ctx = await guard();
  if ('error' in ctx) return ctx.error;

  const runs = await prisma.syncRun.findMany({
    where: { orgId: ctx.orgId },
    include: { integration: true },
    orderBy: { startedAt: 'desc' },
    take: 40,
  });

  return NextResponse.json(runs);
}
