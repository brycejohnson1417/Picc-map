import { auth } from '@clerk/nextjs/server';
import { ensureWorkspaceAndMembership } from '@/lib/auth/bootstrap';
import { DEMO_MODE, DEMO_ORG_ID, DEMO_USER_ID } from '@/lib/config/runtime';

export async function requireWorkspaceContext() {
  if (DEMO_MODE) {
    return { userId: DEMO_USER_ID, orgId: DEMO_ORG_ID };
  }

  const { userId, orgId } = await auth();

  if (!userId) {
    throw new Error('UNAUTHENTICATED');
  }

  if (!orgId) {
    throw new Error('NO_ORGANIZATION');
  }

  const workspaceOrgId = await ensureWorkspaceAndMembership(orgId, userId);
  return { userId, orgId: workspaceOrgId };
}
