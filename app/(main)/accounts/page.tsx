import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { AccountsTable } from '@/components/crm/accounts-table';
import { getAccounts } from '@/lib/data/accounts';

export default async function AccountsPage() {
  const { orgId } = await requireWorkspaceContext();

  const data = await getAccounts(orgId);
  const rows = data.map((row) => {
    const latest = row.overdueSnapshots[0];
    const daysOverdue = Math.max(latest?.daysOverdue1 ?? 0, latest?.daysOverdue2 ?? 0, latest?.daysOverdue3 ?? 0);
    return {
      id: row.id,
      name: row.name,
      licenseNumber: row.licenseNumber,
      status: row.status,
      city: row.city,
      state: row.state,
      contactsCount: row.contacts.length,
      openValue: row.opportunities.reduce((sum, item) => sum + Number(item.value), 0),
      daysOverdue,
      lastUpdated: new Date(row.updatedAt).toLocaleDateString(),
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Accounts</h1>
        <p className="text-sm text-slate-500">Primary dispensary table with filters, saved views, bulk tools, and export.</p>
      </header>
      <AccountsTable rows={rows} />
    </div>
  );
}
