'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, LayoutDashboard, MapPinned, Menu, Search, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, Input } from '@/components/ui';
import { CommandPalette } from '@/components/crm/command-palette';

const navItems = [
  { href: '/territory', label: 'Territory', icon: MapPinned },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const active = useMemo(
    () => navItems.find((item) => pathname?.startsWith(item.href))?.href,
    [pathname],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <CommandPalette />
      <div className="hidden md:flex">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 border-r bg-white transition-all dark:bg-slate-950 dark:border-slate-800',
            collapsed ? 'w-[78px]' : 'w-[260px]',
          )}
        >
          <div className="flex h-16 items-center gap-2 border-b px-4 dark:border-slate-800">
            <div className="h-8 w-8 rounded-lg bg-primary text-white grid place-items-center font-bold">P</div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold">PICC CRM</p>
                <p className="text-xs text-slate-500">Dispensary OS</p>
              </div>
            )}
            <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setCollapsed((v) => !v)}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          <nav className="space-y-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors',
                    active === item.href
                      ? 'bg-blue-50 text-primary dark:bg-blue-900/20'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="ml-3">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 border-t p-3 dark:border-slate-800">
            <Button className="w-full" size={collapsed ? 'icon' : 'md'}>
              {collapsed ? '+' : 'New Account'}
            </Button>
          </div>
        </aside>
        <div className={cn('flex-1 transition-all', collapsed ? 'ml-[78px]' : 'ml-[260px]')}>
          <TopBar onMobileOpen={() => setMobileOpen(true)} />
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>

      <div className="md:hidden">
        <TopBar onMobileOpen={() => setMobileOpen(true)} />
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)}>
            <aside className="h-full w-[280px] bg-white p-4 dark:bg-slate-950" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary text-white grid place-items-center font-bold">P</div>
                <div>
                  <p className="text-sm font-semibold">PICC CRM</p>
                  <p className="text-xs text-slate-500">Dispensary OS</p>
                </div>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex h-10 items-center rounded-lg px-3 text-sm font-medium',
                        active === item.href ? 'bg-blue-50 text-primary dark:bg-blue-900/20' : 'text-slate-600',
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="ml-3">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}
        <main className="pb-20 p-4">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-3 border-t bg-white p-2 dark:bg-slate-950 dark:border-slate-800">
          {[
            { href: '/territory', label: 'Map', icon: MapPinned },
            { href: '/dashboard', label: 'Dash', icon: LayoutDashboard },
            { href: '/settings', label: 'More', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-1 py-1 text-xs', active === item.href ? 'text-primary' : 'text-slate-500')}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function TopBar({ onMobileOpen }: { onMobileOpen: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur dark:bg-slate-950/90 dark:border-slate-800">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMobileOpen}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search accounts, contacts, tasks... (⌘K)" onFocus={(e) => e.currentTarget.blur()} />
        </div>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
