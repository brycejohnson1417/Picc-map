import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { loadCRMRecords, type CRMRecord } from '../services/crmService';

export const SalesCRM: React.FC = () => {
  const [rows, setRows] = useState<CRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<CRMRecord | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toISOString());

  const refresh = async () => {
    setLoading(true);
    const data = await loadCRMRecords();
    setRows(data);
    setSelected((prev) => (prev ? data.find((d) => d.id === prev.id) || null : null));
    setLastRefreshed(new Date().toISOString());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const statuses = useMemo(() => {
    const set = new Set(rows.map((r) => r.accountStatus).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase();
      const matchesQ = !q || r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.rep.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.accountStatus === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales CRM</h2>
          <p className="text-slate-500 text-sm">Live data from Notion Dispensary Master List CRM. Showing {filtered.length} of {rows.length} dispensaries.</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Last refreshed: {new Date(lastRefreshed).toLocaleString()}</div>
          <button onClick={refresh} className="text-sm text-indigo-600 hover:text-indigo-800 mt-1">Refresh</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search store, city, rep..."
          className="w-full md:w-80 border border-slate-300 rounded-lg px-3 py-2"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading CRM records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-slate-500 text-sm">No records found. Check CRM database mapping in Settings.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Dispensary</th>
                  <th className="text-left px-4 py-3 font-semibold">Account Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Vendor Day</th>
                  <th className="text-left px-4 py-3 font-semibold">City</th>
                  <th className="text-left px-4 py-3 font-semibold">Rep</th>
                  <th className="text-left px-4 py-3 font-semibold">Last Edited</th>
                  <th className="text-left px-4 py-3 font-semibold">Open</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={`border-t border-slate-100 cursor-pointer ${selected?.id === r.id ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3 text-slate-800 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-slate-700">{r.accountStatus || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{r.vendorDayStatus || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{r.city || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{r.rep || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.lastEdited ? new Date(r.lastEdited).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      {r.notionUrl ? (
                        <a onClick={(e) => e.stopPropagation()} href={r.notionUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                          Open <ExternalLink size={14} />
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Dispensary Details</h3>
          {selected?.notionUrl && (
            <a href={selected.notionUrl} target="_blank" rel="noreferrer" className="text-sm inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
              Open in Notion <ExternalLink size={14} />
            </a>
          )}
        </div>
        {!selected ? (
          <div className="text-sm text-slate-500">Select a dispensary row to view all properties.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {selected.properties.map((prop) => (
              <div key={prop.name} className="border border-slate-100 rounded-lg px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-slate-500">{prop.name}</div>
                <div className="text-slate-800 mt-1 break-words">{prop.value || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
