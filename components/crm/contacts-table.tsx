'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { AdvancedDataTable } from '@/components/crm/advanced-data-table';
import { Badge } from '@/components/ui';

export type ContactTableRow = {
  id: string;
  name: string;
  roleTitle: string;
  accountName: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  linkedWork: string;
};

const columns: ColumnDef<ContactTableRow>[] = [
  {
    accessorKey: 'name',
    header: 'Contact',
    cell: ({ row }) => (
      <div>
        <p className="font-semibold">{row.original.name}</p>
        <p className="text-xs text-slate-500">{row.original.roleTitle}</p>
      </div>
    ),
  },
  {
    accessorKey: 'accountName',
    header: 'Dispensary',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge variant={row.original.status === 'ACTIVE' ? 'success' : 'secondary'}>{row.original.status}</Badge>,
  },
  {
    accessorKey: 'linkedWork',
    header: 'Linked Work',
  },
];

export function ContactsTable({ rows }: { rows: ContactTableRow[] }) {
  return <AdvancedDataTable title="Contact Directory" data={rows} columns={columns} searchPlaceholder="Search contact, role, or dispensary..." />;
}
