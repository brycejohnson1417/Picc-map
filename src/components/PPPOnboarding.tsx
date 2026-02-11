import React, { useState, useEffect } from 'react';
import { Dispensary, PPPStatus } from '../types';
import { MOCK_DISPENSARIES } from '../constants';
import { KanbanSquare, MoreHorizontal, MapPin, User, AlertTriangle, ArrowRight, RefreshCw, Database } from 'lucide-react';
import { getSheetData } from '../services/sheetsService';

export const PPPOnboarding: React.FC = () => {
  const [dispensaries, setDispensaries] = useState<Dispensary[]>(MOCK_DISPENSARIES);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'mock' | 'sheet'>('mock');

  const statuses: PPPStatus[] = [
    'Not Started',
    'Invited',
    'Onboarding Pending',
    'API Key Needed',
    'Approved & Connected'
  ];

  const fetchLiveStats = async () => {
    setIsLoading(true);
    try {
        const sheetData = await getSheetData();
        if (sheetData.length > 0) {
            setDispensaries(sheetData);
            setDataSource('sheet');
        } else {
            console.log("No sheet data returned, sticking to mock.");
        }
    } catch (e) {
        console.error("Error loading sheet data", e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
      // Try to load sheet data on mount if credentials exist
      if (localStorage.getItem('google_sheet_id')) {
          fetchLiveStats();
      }
  }, []);

  const moveNext = (id: string, currentStatus: PPPStatus) => {
    const currentIndex = statuses.indexOf(currentStatus);
    if (currentIndex < statuses.length - 1) {
      const nextStatus = statuses[currentIndex + 1];
      setDispensaries(prev => prev.map(d => 
        d.id === id ? { ...d, pppStatus: nextStatus } : d
      ));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <KanbanSquare className="text-indigo-600" /> PPP Onboarding Workflow
            </h1>
            <p className="text-slate-500 mt-1">Track dispensary integrations from invitation to connection.</p>
            
            <div className="mt-4 flex gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded text-amber-800">
                    <AlertTriangle size={14} />
                    <span><strong>Bottleneck Alert:</strong> {dispensaries.filter(d => d.pppStatus === 'API Key Needed').length} stores waiting for API Keys.</span>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${dataSource === 'sheet' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                <Database size={14} /> {dataSource === 'sheet' ? 'Live Sheets Data' : 'Demo Data'}
            </div>
            <button 
                onClick={fetchLiveStats}
                disabled={isLoading}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors disabled:opacity-50"
                title="Sync from Google Sheets"
            >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {statuses.map((status) => (
            <div key={status} className="w-80 flex flex-col">
              <div className={`flex items-center justify-between p-3 rounded-t-lg border-b-2 font-semibold text-sm ${
                  status === 'API Key Needed' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                <span>{status}</span>
                <span className="bg-white/50 px-2 py-0.5 rounded text-xs">
                  {dispensaries.filter(d => d.pppStatus === status).length}
                </span>
              </div>
              
              <div className={`flex-1 p-2 bg-slate-50/50 rounded-b-lg border-x border-b border-slate-200 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] custom-scrollbar`}>
                {dispensaries
                  .filter(d => d.pppStatus === status)
                  .map(dispensary => (
                    <div 
                      key={dispensary.id} 
                      className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-800 line-clamp-1" title={dispensary.name}>{dispensary.name}</h4>
                        <button className="text-slate-400 hover:text-indigo-600">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                      
                      <div className="space-y-1 text-xs text-slate-500 mb-4">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin size={12} /> {dispensary.location}
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <User size={12} /> {dispensary.contactPerson}
                        </div>
                        {dispensary.salesRep && (
                            <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-indigo-600">
                                Rep: {dispensary.salesRep}
                            </div>
                        )}
                        {dispensary.totalOrders && dispensary.totalOrders > 0 && (
                            <div className="text-[10px] text-emerald-600 font-medium">
                                {dispensary.totalOrders} Orders ({dispensary.totalOrderedAmount})
                            </div>
                        )}
                      </div>

                      {status !== 'Approved & Connected' && (
                        <button 
                          onClick={() => moveNext(dispensary.id, status)}
                          className="w-full flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded text-xs font-medium transition-colors"
                        >
                          Next Stage <ArrowRight size={12} />
                        </button>
                      )}
                      
                      {status === 'API Key Needed' && (
                          <div className="mt-2 text-[10px] text-amber-600 flex items-center gap-1">
                              <AlertTriangle size={10} /> {dispensary.creditStatus || "Pending Owner Action"}
                          </div>
                      )}
                    </div>
                  ))}
                  
                  {dispensaries.filter(d => d.pppStatus === status).length === 0 && (
                      <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                          No items
                      </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
