import { requireWorkspaceContext } from '@/lib/auth/workspace';
import { ContactsTable } from '@/components/crm/contacts-table';
import { prisma } from '@/lib/db/prisma';

export default async function ContactsPage() {
  const { orgId } = await requireWorkspaceContext();

  const contacts = await prisma.contact.findMany({
    where: { orgId },
    include: { account: true, opportunities: true, tasks: true, activityLogs: { take: 1, orderBy: { createdAt: 'desc' } } },
    orderBy: { updatedAt: 'desc' },
  });
  const rows = contacts.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`,
    roleTitle: row.roleTitle,
    accountName: row.account.name,
    email: row.email ?? '—',
    phone: row.phone ?? '—',
    status: row.status,
    linkedWork: `${row.opportunities.length} opps · ${row.tasks.length} tasks`,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Contacts</h1>
        <p className="text-sm text-slate-500">High-turnover contact table. Mark inactive instantly while preserving account history.</p>
      </header>
      <ContactsTable rows={rows} />
    </div>
  );
}
