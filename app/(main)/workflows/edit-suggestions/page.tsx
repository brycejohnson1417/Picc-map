import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { prisma } from '@/lib/db/prisma';

export default async function EditSuggestionWorkflowPage() {
  const { orgId } = await requireWorkspaceContext();

  const suggestions = await prisma.editSuggestion.findMany({
    where: { orgId },
    include: { account: true, contact: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Edit Suggestions</h1>
        <p className="text-sm text-slate-500">
          Brand Ambassador-safe update flow for restricted account/contact changes that require approval.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-slate-500">No pending suggestions yet.</p>
          ) : (
            suggestions.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.account.name}</p>
                    <p className="text-xs text-slate-500">
                      Suggested by {item.suggestedBy}
                      {item.contact ? ` · Contact: ${item.contact.firstName} ${item.contact.lastName}` : ''}
                    </p>
                  </div>
                  <Badge variant={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'danger' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.reason ?? 'No reason provided.'}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
