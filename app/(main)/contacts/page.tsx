import { ContactsTable } from '@/components/crm/contacts-table';
import { loadLiveNotionContacts } from '@/lib/server/notion-live-crm';

export default async function ContactsPage() {
  const rows = await loadLiveNotionContacts();

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
