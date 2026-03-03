import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  accountId: z.string().cuid(),
  sourceLicenseId: z.string().optional(),
  creditStatus: z.string().optional(),
  overdueOrders: z.number().int().default(0),
  daysOverdue1: z.number().int().default(0),
  daysOverdue2: z.number().int().default(0),
  daysOverdue3: z.number().int().default(0),
  amountOverdue: z.number().optional(),
});

export async function GET() {
  const ctx = await guard();
  if ('error' in ctx) return ctx.error;
  const rows = await prisma.overdueSnapshot.findMany({ where: { orgId: ctx.orgId }, include: { account: true }, orderBy: { snapshotDate: 'desc' } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'FINANCE']);
  if ('error' in ctx) return ctx.error;
  const payload = schema.parse(await req.json());

  const snapshot = await prisma.overdueSnapshot.create({
    data: { orgId: ctx.orgId, ...payload },
  });

  return NextResponse.json(snapshot, { status: 201 });
}
