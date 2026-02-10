import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  PieChart, 
  Settings, 
  LogOut,
  Briefcase,
  HeadphonesIcon,
  KanbanSquare,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentRole: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setRole: (role: UserRole) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRole, activeTab, setActiveTab, setRole }) => {
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'service-center', label: 'Service Center', icon: HeadphonesIcon },
    { id: 'ppp', label: 'PPP Onboarding', icon: KanbanSquare },
    { id: 'wiki', label: 'Notion Wiki', icon: FileText },
    { id: 'sales', label: 'Sales CRM', icon: Briefcase },
    { id: 'finance', label: 'Finance Reports', icon: PieChart },
    { id: 'team', label: 'Team Directory', icon: Users },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 z-10">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl">P</div>
          <span className="font-bold text-lg tracking-tight">PICC Platform</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">Internal Workspace</div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === item.id 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        <div className="pt-4 mt-4 border-t border-slate-800">
            <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'admin' 
                    ? 'bg-indigo-900 text-indigo-100 border border-indigo-700' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
                <ShieldCheck size={20} />
                <span className="font-medium">Admin & Audit</span>
            </button>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => setActiveTab('customer-portal')}
          className="w-full mb-6 bg-teal-800 hover:bg-teal-700 text-teal-100 border border-teal-600 px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
        >
          <Globe size={16} />
          <span>Open External Portal</span>
        </button>

        <label className="block text-xs text-slate-500 mb-2 uppercase font-semibold">Switch View (Demo)</label>
        <select 
          value={currentRole}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full bg-slate-800 text-slate-200 text-sm rounded p-2 border border-slate-700 focus:outline-none focus:border-indigo-500"
        >
          {Object.values(UserRole).map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        
        <button 
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-2 mt-4 px-4 py-2 text-sm rounded-lg transition-colors ${
            activeTab === 'settings' 
              ? 'bg-slate-800 text-white' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-2 mt-1 px-4 py-2 text-slate-400 hover:text-red-400 text-sm hover:bg-slate-800 rounded-lg transition-colors">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
