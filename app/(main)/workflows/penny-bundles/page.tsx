import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { prisma } from '@/lib/db/prisma';
import { currency } from '@/lib/utils';

export default async function PennyBundlesWorkflowPage() {
  const { orgId } = await requireWorkspaceContext();

  const items = await prisma.pennyBundleCreditSubmission.findMany({ where: { orgId }, include: { account: true, vendorDayEvent: true }, orderBy: { createdAt: 'desc' } });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Penny Bundle Credits</h1>
        <p className="text-sm text-slate-500">Review and process penny bundle promotion credit submissions.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Submission Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{item.account.name}</p>
                <Badge variant={item.status === 'APPROVED' || item.status === 'COMPLETED' ? 'success' : 'warning'}>{item.status}</Badge>
              </div>
              <p className="text-sm text-slate-500">Order #{item.orderNumber ?? '—'} · Credit Memo {item.creditMemo ?? '—'}</p>
              <p className="text-sm">Amount: {currency(Number(item.creditAmount || 0))}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
