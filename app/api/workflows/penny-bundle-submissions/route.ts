import { NextResponse } from 'next/server';
import { ActivityType, WorkflowStatus } from '@prisma/client';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { prisma } from '@/lib/db/prisma';
import { writeActivity } from '@/lib/activity-log/write';

const schema = z.object({
  accountId: z.string().cuid(),
  vendorDayEventId: z.string().cuid().optional().nullable(),
  orderNumber: z.string().optional(),
  creditMemo: z.string().optional(),
  creditAmount: z.number().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.SUBMITTED),
});

export async function GET() {
  const ctx = await guard();
  if ('error' in ctx) return ctx.error;
  const rows = await prisma.pennyBundleCreditSubmission.findMany({ where: { orgId: ctx.orgId }, include: { account: true, vendorDayEvent: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'FINANCE', 'BRAND_AMBASSADOR']);
  if ('error' in ctx) return ctx.error;
  const payload = schema.parse(await req.json());

  const record = await prisma.pennyBundleCreditSubmission.create({
    data: { ...payload, orgId: ctx.orgId, requestedBy: ctx.userId },
  });

  await writeActivity({
    orgId: ctx.orgId,
    accountId: payload.accountId,
    actorClerkUserId: ctx.userId,
    type: ActivityType.NOTE_ADDED,
    title: 'Penny bundle credit submitted',
    description: payload.orderNumber ?? payload.creditMemo ?? 'Submission created',
  });

  return NextResponse.json(record, { status: 201 });
}
