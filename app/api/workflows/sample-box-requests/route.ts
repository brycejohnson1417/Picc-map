import { NextResponse } from 'next/server';
import { ActivityType, WorkflowStatus } from '@prisma/client';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { prisma } from '@/lib/db/prisma';
import { writeActivity } from '@/lib/activity-log/write';

const schema = z.object({
  accountId: z.string().cuid(),
  contactId: z.string().cuid().optional().nullable(),
  requestReason: z.string().min(3),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.SUBMITTED),
});

export async function GET() {
  const ctx = await guard();
  if ('error' in ctx) return ctx.error;
  const rows = await prisma.sampleBoxRequest.findMany({ where: { orgId: ctx.orgId }, include: { account: true, contact: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP', 'BRAND_AMBASSADOR']);
  if ('error' in ctx) return ctx.error;
  const payload = schema.parse(await req.json());

  const request = await prisma.sampleBoxRequest.create({
    data: {
      orgId: ctx.orgId,
      accountId: payload.accountId,
      contactId: payload.contactId,
      requestReason: payload.requestReason,
      status: payload.status,
      requestedBy: ctx.userId,
    },
  });

  await writeActivity({
    orgId: ctx.orgId,
    accountId: payload.accountId,
    contactId: payload.contactId ?? undefined,
    actorClerkUserId: ctx.userId,
    type: ActivityType.NOTE_ADDED,
    title: 'Sample box requested',
    description: payload.requestReason,
  });

  return NextResponse.json(request, { status: 201 });
}
