import { NextResponse } from 'next/server';
import { ActivityType, WorkflowStatus } from '@prisma/client';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { prisma } from '@/lib/db/prisma';
import { writeActivity } from '@/lib/activity-log/write';

const schema = z.object({
  accountId: z.string().cuid(),
  opportunityId: z.string().cuid().optional().nullable(),
  source: z.string().min(1),
  referredBy: z.string().min(1),
  orderNumber: z.string().optional(),
  orderTotal: z.number().optional(),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.SUBMITTED),
});

export async function GET() {
  const ctx = await guard();
  if ('error' in ctx) return ctx.error;
  const rows = await prisma.referralRecord.findMany({ where: { orgId: ctx.orgId }, include: { account: true, opportunity: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP']);
  if ('error' in ctx) return ctx.error;
  const payload = schema.parse(await req.json());

  const referral = await prisma.referralRecord.create({ data: { orgId: ctx.orgId, ...payload } });

  await writeActivity({
    orgId: ctx.orgId,
    accountId: payload.accountId,
    opportunityId: payload.opportunityId ?? undefined,
    actorClerkUserId: ctx.userId,
    type: ActivityType.NOTE_ADDED,
    title: 'Referral record created',
    description: `${payload.source} / ${payload.referredBy}`,
  });

  return NextResponse.json(referral, { status: 201 });
}
