import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  PieChart,
  Settings,
  Briefcase,
  HeadphonesIcon,
  KanbanSquare,
  Globe,
  ShieldCheck,
  ClipboardList,
  CalendarCheck2,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentRole: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setRole: (role: UserRole) => void;
}

type NavItem = { id: string; label: string; icon: LucideIcon; group: string };

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Mission Dashboard', icon: LayoutDashboard, group: 'Command Center' },
  { id: 'service-center', label: 'Service Center', icon: HeadphonesIcon, group: 'Operations' },
  { id: 'ppp', label: 'PPP Pipeline', icon: KanbanSquare, group: 'Operations' },
  { id: 'ba-ops', label: 'BA Ops', icon: CalendarCheck2, group: 'Operations' },
  { id: 'sales', label: 'Sales CRM', icon: Briefcase, group: 'Revenue' },
  { id: 'proposals', label: 'Proposal Builder', icon: ClipboardList, group: 'Revenue' },
  { id: 'finance', label: 'Finance Reports', icon: PieChart, group: 'Revenue' },
  { id: 'team', label: 'Team Directory', icon: Users, group: 'People & Knowledge' },
  { id: 'wiki', label: 'Notion Wiki', icon: FileText, group: 'People & Knowledge' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentRole, activeTab, setActiveTab, setRole }) => {
  const groups = Array.from(new Set(navItems.map((item) => item.group)));

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 z-10">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl">P</div>
          <span className="font-bold text-lg tracking-tight">PICC Command</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">Operations Control Room</div>
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group}>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-2 pb-2">{group}</div>
            <div className="space-y-1">
              {navItems.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon size={18} />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('admin')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
              activeTab === 'admin' ? 'bg-indigo-900 text-indigo-100 border border-indigo-700' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ShieldCheck size={18} />
            <span className="font-medium text-sm">Admin & Audit</span>
          </button>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-3">
        <button
          onClick={() => setActiveTab('customer-portal')}
          className="w-full bg-teal-800 hover:bg-teal-700 text-teal-100 border border-teal-600 px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
        >
          <Globe size={16} />
          <span>External Portal</span>
        </button>

        <div>
          <label className="block text-xs text-slate-500 mb-2 uppercase font-semibold">Role Preview</label>
          <select
            value={currentRole}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full bg-slate-800 text-slate-200 text-sm rounded p-2 border border-slate-700 focus:outline-none focus:border-indigo-500"
          >
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};
