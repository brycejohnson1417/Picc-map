import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { loadTeamDirectoryData } from '../services/moduleDataService';
import type { TeamMember } from '../types';

export const TeamDirectory: React.FC = () => {
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [warning, setWarning] = useState<string | undefined>(undefined);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const refresh = async (): Promise<void> => {
    setLoading(true);
    const data = await loadTeamDirectoryData();
    setRows(data.rows);
    setWarning(data.warning);
    setLastRefreshed(data.lastRefreshed);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((row) => !q || row.name.toLowerCase().includes(q) || row.role.toLowerCase().includes(q) || row.region.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Team Directory</h2>
          <p className="text-sm text-slate-500">Sales reps and ambassadors from Notion.</p>
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

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search team by name, role, or region"
          className="w-full md:w-80 border border-slate-300 rounded-lg px-3 py-2"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading team directory...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No team records found. Map Team Directory in Settings and ensure shared access to the database.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Role</th>
                  <th className="text-left px-4 py-3 font-semibold">Region</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Phone</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-800 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-slate-700">{row.role}</td>
                    <td className="px-4 py-3 text-slate-700">{row.region}</td>
                    <td className="px-4 py-3 text-slate-700">{row.status}</td>
                    <td className="px-4 py-3 text-slate-700">{row.email}</td>
                    <td className="px-4 py-3 text-slate-700">{row.phone}</td>
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
