import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { UserRole, WorkOrder } from '../types';
import { loadServiceCenterData } from '../services/moduleDataService';

interface ServiceWorkspaceProps {
  currentUserRole: UserRole;
}

export const ServiceWorkspace: React.FC<ServiceWorkspaceProps> = ({ currentUserRole }) => {
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [warning, setWarning] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toISOString());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const refresh = async (): Promise<void> => {
    setLoading(true);
    const data = await loadServiceCenterData();
    setRows(data.rows);
    setWarning(data.warning);
    setLastRefreshed(data.lastRefreshed);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !q || row.title.toLowerCase().includes(q) || row.requesterName.toLowerCase().includes(q) || row.ticketNumber.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const statuses = useMemo(() => Array.from(new Set(rows.map((row) => row.status))), [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Service Center</h2>
          <p className="text-sm text-slate-500">Unified support operations for {currentUserRole}.</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Last refreshed: {new Date(lastRefreshed).toLocaleString()}</div>
          <button onClick={refresh} className="text-indigo-600 hover:text-indigo-800 text-sm mt-1">Refresh</button>
        </div>
      </div>

      {warning && !loading && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle size={16} /> {warning}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ticket, title, requester..."
          className="w-full md:w-80 border border-slate-300 rounded-lg px-3 py-2"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading service tickets...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No tickets found. Confirm Work Orders mapping in Settings.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Ticket</th>
                  <th className="text-left px-4 py-3 font-semibold">Title</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold">Requester</th>
                  <th className="text-left px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700 font-mono">{row.ticketNumber}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{row.title}</td>
                    <td className="px-4 py-3 text-slate-700">{row.type}</td>
                    <td className="px-4 py-3 text-slate-700">{row.status}</td>
                    <td className="px-4 py-3 text-slate-700">{row.priority}</td>
                    <td className="px-4 py-3 text-slate-700">{row.requesterName}</td>
                    <td className="px-4 py-3 text-slate-500">{row.dateCreated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
