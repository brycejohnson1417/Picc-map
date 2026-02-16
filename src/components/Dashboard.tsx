import React, { useEffect, useState } from 'react';
import { UserRole } from '../types';
import { AlertCircle, Briefcase, Calendar, Database, Loader2, Users } from 'lucide-react';
import { loadCommandCenterMetrics, type CommandCenterMetrics } from '../services/commandCenterService';

interface DashboardProps {
  currentRole: UserRole;
}

const EMPTY_METRICS: CommandCenterMetrics = {
  customers: 0,
  leads: 0,
  openWorkOrders: 0,
  pendingVendorSubmissions: 0,
  activeInventorySkus: 0,
  recentUpdates: [],
  dbMap: {},
  source: 'fallback',
};

export const Dashboard: React.FC<DashboardProps> = ({ currentRole }) => {
  const [metrics, setMetrics] = useState<CommandCenterMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const data = await loadCommandCenterMetrics();
    setMetrics(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const cards = [
    { label: 'Customers', value: metrics.customers, icon: <Users size={18} />, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Leads', value: metrics.leads, icon: <Users size={18} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Open Work Orders', value: metrics.openWorkOrders, icon: <Briefcase size={18} />, color: 'bg-amber-50 text-amber-600' },
    { label: 'Pending Vendor Submissions', value: metrics.pendingVendorSubmissions, icon: <Calendar size={18} />, color: 'bg-rose-50 text-rose-600' },
    { label: 'Active Inventory SKUs', value: metrics.activeInventorySkus, icon: <Database size={18} />, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PICC Command Center</h1>
          <p className="text-slate-500">Live operations snapshot for {currentRole}.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <button onClick={refresh} className="text-sm text-indigo-600 hover:text-indigo-800 mt-1">Refresh live data</button>
        </div>
      </div>

      {metrics.source === 'fallback' && !loading && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle size={16} />
          Could not read live Notion data. Check auth and database mappings in Settings.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{card.label}</div>
              <div className={`p-2 rounded-lg ${card.color}`}>{card.icon}</div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{loading ? '—' : card.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity (Notion)</h3>
          {loading ? (
            <div className="text-slate-500 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading updates...</div>
          ) : metrics.recentUpdates.length === 0 ? (
            <div className="text-slate-500 text-sm">No updates found.</div>
          ) : (
            <div className="space-y-3">
              {metrics.recentUpdates.map((item, idx) => (
                <div key={`${item.title}-${idx}`} className="pb-3 border-b border-slate-100 last:border-b-0">
                  <div className="font-medium text-slate-800 text-sm">{item.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{item.source} • {item.lastEdited ? new Date(item.lastEdited).toLocaleString() : 'Unknown time'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Connected Data Sources</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(metrics.dbMap).length === 0 ? (
              <div className="text-slate-500">No database mappings saved yet. Go to Settings → Notion.</div>
            ) : (
              Object.entries(metrics.dbMap).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
                  <span className="font-medium text-slate-700">{key}</span>
                  <span className="text-xs text-slate-500 font-mono">{value}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
