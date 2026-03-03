import { NextResponse } from 'next/server';
import { ActivityType, Prisma, WorkflowStatus } from '@prisma/client';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { prisma } from '@/lib/db/prisma';
import { writeActivity } from '@/lib/activity-log/write';

const createSchema = z.object({
  accountId: z.string().cuid(),
  contactId: z.string().cuid().optional().nullable(),
  patch: z.record(z.string(), z.unknown()),
  reason: z.string().max(1000).optional(),
});

const updateSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(WorkflowStatus),
});

export async function GET() {
  const ctx = await guard();
  if ('error' in ctx) return ctx.error;

  const rows = await prisma.editSuggestion.findMany({
    where: { orgId: ctx.orgId },
    include: { account: true, contact: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP', 'BRAND_AMBASSADOR']);
  if ('error' in ctx) return ctx.error;

  const payload = createSchema.parse(await req.json());

  const suggestion = await prisma.editSuggestion.create({
    data: {
      orgId: ctx.orgId,
      accountId: payload.accountId,
      contactId: payload.contactId,
      suggestedBy: ctx.userId,
      status: WorkflowStatus.SUBMITTED,
      patch: payload.patch as Prisma.InputJsonValue,
      reason: payload.reason,
    },
  });

  await writeActivity({
    orgId: ctx.orgId,
    accountId: payload.accountId,
    contactId: payload.contactId ?? undefined,
    actorClerkUserId: ctx.userId,
    type: ActivityType.NOTE_ADDED,
    title: 'Edit suggestion submitted',
    description: payload.reason ?? 'Brand Ambassador suggestion created for approval.',
  });

  return NextResponse.json(suggestion, { status: 201 });
}

export async function PATCH(req: Request) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP']);
  if ('error' in ctx) return ctx.error;

  const payload = updateSchema.parse(await req.json());

  const updated = await prisma.editSuggestion.update({
    where: { id: payload.id },
    data: {
      status: payload.status,
      approvedBy: ctx.userId,
    },
  });

  await writeActivity({
    orgId: ctx.orgId,
    accountId: updated.accountId,
    contactId: updated.contactId ?? undefined,
    actorClerkUserId: ctx.userId,
    type: ActivityType.ACCOUNT_UPDATED,
    title: 'Edit suggestion reviewed',
    description: `Status changed to ${payload.status}`,
  });

  return NextResponse.json(updated);
}
