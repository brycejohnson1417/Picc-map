import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { prisma } from '@/lib/db/prisma';
import { currency, number } from '@/lib/utils';

export default async function ReportsPage() {
  const { orgId } = await requireWorkspaceContext();

  const [referrals, pennyBundles, overdue, sampleRequests, openOpp] = await Promise.all([
    prisma.referralRecord.count({ where: { orgId } }),
    prisma.pennyBundleCreditSubmission.count({ where: { orgId } }),
    prisma.overdueSnapshot.count({ where: { orgId, OR: [{ daysOverdue1: { gt: 0 } }, { daysOverdue2: { gt: 0 } }, { daysOverdue3: { gt: 0 } }] } }),
    prisma.sampleBoxRequest.count({ where: { orgId } }),
    prisma.opportunity.aggregate({ where: { orgId, status: 'OPEN' }, _sum: { value: true } }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-sm text-slate-500">Revenue forecasting, source attribution, and workflow health snapshots.</p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ReportCard label="Referral Records" value={number(referrals)} />
        <ReportCard label="Penny Bundle Requests" value={number(pennyBundles)} />
        <ReportCard label="Overdue Accounts" value={number(overdue)} />
        <ReportCard label="Sample Box Requests" value={number(sampleRequests)} />
        <ReportCard label="Open Opportunity Value" value={currency(Number(openOpp._sum.value || 0))} />
      </div>
    </div>
  );
}

function ReportCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
