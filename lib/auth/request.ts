import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireRole } from '@/lib/rbac/guards';
import type { AppRole } from '@/lib/types/rbac';
import { ensureWorkspaceAndMembership } from '@/lib/auth/bootstrap';
import { DEMO_MODE, DEMO_ORG_ID, DEMO_USER_ID } from '@/lib/config/runtime';

export async function withOrg() {
  if (DEMO_MODE) {
    return { userId: DEMO_USER_ID, orgId: DEMO_ORG_ID };
  }

  const { userId, orgId } = await auth();

  if (!userId) {
    throw NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  if (!orgId) {
    throw NextResponse.json({ error: 'Organization required' }, { status: 400 });
  }

  const workspaceOrgId = await ensureWorkspaceAndMembership(orgId, userId);
  return { userId, orgId: workspaceOrgId };
}

export async function withRole(allowedRoles: AppRole[]) {
  const { userId, orgId } = await withOrg();
  await requireRole(orgId, userId, allowedRoles);
  return { userId, orgId };
}
