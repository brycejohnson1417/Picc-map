import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { prisma } from '@/lib/db/prisma';
import { currency } from '@/lib/utils';

export default async function PipelinesPage() {
  const { orgId } = await requireWorkspaceContext();

  const pipeline = await prisma.pipeline.findFirst({
    where: { orgId },
    include: {
      stages: {
        orderBy: { sortOrder: 'asc' },
        include: {
          opportunities: {
            where: { status: 'OPEN' },
            include: { account: true },
            orderBy: { updatedAt: 'desc' },
          },
        },
      },
    },
  });

  if (!pipeline) {
    return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">No pipeline configured.</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Pipelines & Opportunities</h1>
        <p className="text-sm text-slate-500">Drag/drop stage movement can be enabled from this persisted stage model.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-4">
        {pipeline.stages.map((stage) => (
          <Card key={stage.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{stage.name}</span>
                <Badge variant="secondary">{stage.opportunities.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stage.opportunities.map((opp) => (
                <div key={opp.id} className="rounded-lg border p-3">
                  <p className="font-semibold text-sm">{opp.name}</p>
                  <p className="text-xs text-slate-500">{opp.account.name}</p>
                  <p className="text-sm font-medium">{currency(Number(opp.value))}</p>
                </div>
              ))}
              {stage.opportunities.length === 0 && <p className="text-xs text-slate-500">No opportunities in this stage.</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
