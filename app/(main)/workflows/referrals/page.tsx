import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { prisma } from '@/lib/db/prisma';
import { currency } from '@/lib/utils';

export default async function ReferralWorkflowPage() {
  const { orgId } = await requireWorkspaceContext();

  const referrals = await prisma.referralRecord.findMany({ where: { orgId }, include: { account: true, opportunity: true }, orderBy: { createdAt: 'desc' } });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Referral Tracking</h1>
        <p className="text-sm text-slate-500">Track referral source attribution, conversion links, and payout readiness.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Referral Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {referrals.map((ref) => (
            <div key={ref.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{ref.account.name}</p>
                <Badge variant={ref.status === 'COMPLETED' ? 'success' : 'secondary'}>{ref.status}</Badge>
              </div>
              <p className="text-sm text-slate-500">Source: {ref.source} · Referred by {ref.referredBy}</p>
              <p className="text-sm">Order {ref.orderNumber ?? '—'} · {currency(Number(ref.orderTotal || 0))}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
