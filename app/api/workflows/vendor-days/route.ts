import { NextResponse } from 'next/server';
import { ActivityType, WorkflowStatus } from '@prisma/client';
import { z } from 'zod';
import { guard } from '@/lib/auth/api-guard';
import { prisma } from '@/lib/db/prisma';
import { writeActivity } from '@/lib/activity-log/write';

const schema = z.object({
  accountId: z.string().cuid(),
  eventDate: z.string(),
  repName: z.string().optional(),
  ambassadorName: z.string().optional(),
  vdContact: z.string().optional(),
  vdContactEmail: z.string().optional(),
  vdContactPhone: z.string().optional(),
  promoStatus: z.string().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.SUBMITTED),
});

export async function GET() {
  const ctx = await guard();
  if ('error' in ctx) return ctx.error;
  const rows = await prisma.vendorDayEvent.findMany({ where: { orgId: ctx.orgId }, include: { account: true }, orderBy: { eventDate: 'asc' } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await guard(['ADMIN', 'OPS_TEAM', 'SALES_REP', 'BRAND_AMBASSADOR']);
  if ('error' in ctx) return ctx.error;
  const payload = schema.parse(await req.json());

  const event = await prisma.vendorDayEvent.create({
    data: {
      orgId: ctx.orgId,
      accountId: payload.accountId,
      eventDate: new Date(payload.eventDate),
      status: payload.status,
      repName: payload.repName,
      ambassadorName: payload.ambassadorName,
      vdContact: payload.vdContact,
      vdContactEmail: payload.vdContactEmail,
      vdContactPhone: payload.vdContactPhone,
      promoStatus: payload.promoStatus,
      notes: payload.notes,
      createdBy: ctx.userId,
    },
  });

  await writeActivity({
    orgId: ctx.orgId,
    accountId: payload.accountId,
    actorClerkUserId: ctx.userId,
    type: ActivityType.APPOINTMENT_CREATED,
    title: 'Vendor day scheduled',
    description: payload.eventDate,
  });

  return NextResponse.json(event, { status: 201 });
}
