import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { prisma } from '@/lib/db/prisma';
import { currency } from '@/lib/utils';

export default async function OverdueWorkflowPage() {
  const { orgId } = await requireWorkspaceContext();

  const overdue = await prisma.overdueSnapshot.findMany({
    where: { orgId, OR: [{ daysOverdue1: { gt: 0 } }, { daysOverdue2: { gt: 0 } }, { daysOverdue3: { gt: 0 } }] },
    include: { account: true },
    orderBy: { snapshotDate: 'desc' },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Overdue Accounts</h1>
        <p className="text-sm text-slate-500">Payment history snapshots from Sheets to prioritize collections.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Collections Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {overdue.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{item.account.name}</p>
                <Badge variant="danger">{Math.max(item.daysOverdue1, item.daysOverdue2, item.daysOverdue3)} days</Badge>
              </div>
              <p className="text-sm text-slate-500">Credit Status: {item.creditStatus ?? 'Unknown'}</p>
              <p className="text-sm">Amount Overdue: {currency(Number(item.amountOverdue || 0))}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
