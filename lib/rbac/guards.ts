import { prisma } from '@/lib/db/prisma';
import { type AppRole } from '@/lib/types/rbac';

export async function getUserRole(orgId: string, clerkUserId: string): Promise<AppRole> {
  const membership = await prisma.membership.findUnique({
    where: {
      orgId_clerkUserId: {
        orgId,
        clerkUserId,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new Error('ROLE_NOT_FOUND');
  }

  return membership.role as AppRole;
}

export async function requireRole(orgId: string, clerkUserId: string, allowed: AppRole[]) {
  const role = await getUserRole(orgId, clerkUserId);

  if (!allowed.includes(role)) {
    throw new Error('FORBIDDEN');
  }

  return role;
}
