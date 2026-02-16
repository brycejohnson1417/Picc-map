import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, KanbanSquare, Loader2 } from 'lucide-react';
import type { Dispensary, PPPStatus } from '../types';
import { loadPPPData } from '../services/moduleDataService';

const statuses: PPPStatus[] = ['Not Started', 'Invited', 'Onboarding Pending', 'API Key Needed', 'Approved & Connected'];

export const PPPOnboarding: React.FC = () => {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [warning, setWarning] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toISOString());

  const refresh = async (): Promise<void> => {
    setLoading(true);
    const data = await loadPPPData();
    setDispensaries(data.rows);
    setWarning(data.warning);
    setLastRefreshed(data.lastRefreshed);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const moveNext = (id: string, currentStatus: PPPStatus): void => {
    const currentIndex = statuses.indexOf(currentStatus);
    if (currentIndex < statuses.length - 1) {
      const nextStatus = statuses[currentIndex + 1];
      setDispensaries((prev) => prev.map((item) => (item.id === id ? { ...item, pppStatus: nextStatus } : item)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><KanbanSquare className="text-indigo-600" /> PPP Onboarding</h2>
          <p className="text-sm text-slate-500">Track dispensary onboarding across integration stages.</p>
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

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading PPP pipeline...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {statuses.map((status) => {
            const items = dispensaries.filter((item) => item.pppStatus === status);
            return (
              <div key={status} className="bg-white border border-slate-200 rounded-xl">
                <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>{status}</span>
                  <span className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5">{items.length}</span>
                </div>
                <div className="p-3 space-y-3 min-h-[220px]">
                  {items.length === 0 ? (
                    <div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg p-3 text-center">No records</div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="border border-slate-200 rounded-lg p-3">
                        <div className="font-medium text-sm text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{item.location}</div>
                        <div className="text-xs text-slate-500">{item.contactPerson}</div>
                        {status !== 'Approved & Connected' && (
                          <button
                            onClick={() => moveNext(item.id, status)}
                            className="mt-2 w-full text-xs border border-slate-200 rounded px-2 py-1.5 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600"
                          >
                            Advance stage <ArrowRight className="inline ml-1" size={12} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
