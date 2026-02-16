import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { loadFinanceReportData, type FinanceReportData } from '../services/moduleDataService';

const EMPTY_DATA: FinanceReportData = {
  rows: [],
  totals: { revenue: 0, expenses: 0, net: 0 },
  source: 'fallback',
  warning: 'Finance data unavailable.',
  lastRefreshed: new Date().toISOString(),
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export const FinanceReports: React.FC = () => {
  const [data, setData] = useState<FinanceReportData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    const next = await loadFinanceReportData();
    setData(next);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Finance Reports</h2>
          <p className="text-sm text-slate-500">Connected Notion finance metrics and summary snapshot.</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Last refreshed: {new Date(data.lastRefreshed).toLocaleString()}</div>
          <button onClick={refresh} className="text-indigo-600 hover:text-indigo-800 text-sm mt-1">Refresh</button>
        </div>
      </div>

      {data.warning && !loading && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle size={16} />
          {data.warning}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ label: 'Revenue', value: data.totals.revenue }, { label: 'Expenses', value: data.totals.expenses }, { label: 'Net', value: data.totals.net }].map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500 uppercase font-semibold">{card.label}</div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{loading ? '—' : formatCurrency(card.value)}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading finance rows...</div>
        ) : data.rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No finance records yet. In Settings, map a Finance database and ensure it has amount/category properties.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Report</th>
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-left font-semibold">Period</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Edited</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                    <td className="px-4 py-3 text-slate-700">{row.category}</td>
                    <td className="px-4 py-3 text-slate-700">{row.period}</td>
                    <td className="px-4 py-3 text-slate-700">{row.status}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.lastEdited ? new Date(row.lastEdited).toLocaleDateString() : '—'}</td>
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
