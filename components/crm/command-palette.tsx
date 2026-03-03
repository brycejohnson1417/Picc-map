'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { PlusCircle } from 'lucide-react';

const items = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', href: '/dashboard', section: 'Navigation' },
  { id: 'nav-accounts', label: 'Go to Accounts', href: '/accounts', section: 'Navigation' },
  { id: 'nav-contacts', label: 'Go to Contacts', href: '/contacts', section: 'Navigation' },
  { id: 'nav-conversations', label: 'Go to Conversations', href: '/conversations', section: 'Navigation' },
  { id: 'new-account', label: 'Create New Account', href: '/accounts?new=1', section: 'Quick Create' },
  { id: 'new-contact', label: 'Create New Contact', href: '/contacts?new=1', section: 'Quick Create' },
  { id: 'new-task', label: 'Create New Task', href: '/tasks?new=1', section: 'Quick Create' },
  { id: 'cmd-export', label: 'Export Contacts CSV', href: '/contacts?export=1', section: 'Commands' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, typeof items>>((acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    }, {});
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={() => setOpen(false)}>
      <Command
        className="mx-auto mt-20 w-full max-w-2xl overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input className="h-12 w-full border-b px-4 text-base outline-none" placeholder="Search actions, records, pages..." />
        <Command.List className="max-h-[60vh] overflow-auto p-2">
          <Command.Empty className="px-4 py-8 text-sm text-slate-500">No matching command.</Command.Empty>
          {Object.entries(grouped).map(([section, sectionItems]) => (
            <Command.Group key={section} heading={section} className="px-2 py-1 text-xs text-slate-500">
              {sectionItems.map((item) => (
                <Command.Item
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onSelect={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <PlusCircle className="h-4 w-4" />
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
