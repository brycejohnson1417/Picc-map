import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { notFound } from 'next/navigation';
import { AccountHero } from '@/components/crm/account-hero';
import { ActivityTimeline } from '@/components/crm/activity-timeline';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { getAccountDetail } from '@/lib/data/accounts';
import { currency, number } from '@/lib/utils';

export default async function AccountDetailPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { orgId } = await requireWorkspaceContext();

  const { accountId } = await params;
  const account = await getAccountDetail(orgId, accountId);

  if (!account) notFound();

  const openValue = account.opportunities
    .filter((opp) => opp.status === 'OPEN')
    .reduce((sum, opp) => sum + Number(opp.value), 0);

  return (
    <div className="space-y-6">
      <AccountHero
        title={account.name}
        subtitle={`${account.address1}, ${account.city}, ${account.state} ${account.zipcode}`}
        status={account.status}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Open Opportunity Value" value={currency(openValue)} />
        <MetricCard label="Active Contacts" value={number(account.contacts.filter((c) => c.status === 'ACTIVE').length)} />
        <MetricCard label="Pending Tasks" value={number(account.tasks.filter((t) => t.status !== 'DONE').length)} />
        <MetricCard label="Vendor Days" value={number(account.vendorDayEvents.length)} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {account.contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-semibold">{contact.firstName} {contact.lastName}</p>
                  <p className="text-sm text-slate-500">{contact.roleTitle} · {contact.email ?? 'No email'}</p>
                </div>
                <Badge variant={contact.status === 'ACTIVE' ? 'success' : 'secondary'}>{contact.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Workflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Referrals: <strong>{account.referrals.length}</strong></p>
            <p>Penny Bundle Submissions: <strong>{account.pennyBundles.length}</strong></p>
            <p>Overdue Snapshots: <strong>{account.overdueSnapshots.length}</strong></p>
            <p>Vendor Day Events: <strong>{account.vendorDayEvents.length}</strong></p>
            <p>Sample Box Requests: <strong>{account.sampleBoxRequests.length}</strong></p>
          </CardContent>
        </Card>
      </section>

      <ActivityTimeline items={account.activityLogs} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
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
