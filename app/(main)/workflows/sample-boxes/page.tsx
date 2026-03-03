import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { prisma } from '@/lib/db/prisma';

export default async function SampleBoxesWorkflowPage() {
  const { orgId } = await requireWorkspaceContext();

  const requests = await prisma.sampleBoxRequest.findMany({ where: { orgId }, include: { account: true, contact: true }, orderBy: { createdAt: 'desc' } });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Sample Box Requests</h1>
        <p className="text-sm text-slate-500">Track lead sample box approvals, fulfillment status, and follow-up dependencies.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Request Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {requests.map((request) => (
            <div key={request.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{request.account.name}</p>
                <Badge variant={request.status === 'APPROVED' || request.status === 'COMPLETED' ? 'success' : 'warning'}>{request.status}</Badge>
              </div>
              <p className="text-sm text-slate-500">Requested by: {request.requestedBy} · Contact: {request.contact ? `${request.contact.firstName} ${request.contact.lastName}` : 'N/A'}</p>
              <p className="text-sm">Reason: {request.requestReason}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
