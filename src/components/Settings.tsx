import React, { useState, useEffect } from 'react';
import { Check, XCircle, RefreshCw, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { validateNotionToken, searchDatabases } from '../services/notionService';
import { NotionDatabase, NotionBot } from '../types';

const DB_FIELDS = [
  { key: 'crm', label: 'CRM Database' },
  { key: 'workOrders', label: 'Work Orders Database' },
  { key: 'vendorSubmissions', label: 'Vendor Submissions Database' },
  { key: 'inventory', label: 'Inventory Database' },
  { key: 'wiki', label: 'Wiki Database' },
] as const;

export const Settings: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<'notion' | 'sheets'>('notion');

  const [botInfo, setBotInfo] = useState<NotionBot | null>(null);
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [dbMap, setDbMap] = useState<Record<string, string>>({});

  const [sheetId, setSheetId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const rawMap = localStorage.getItem('notion_db_map');
    if (rawMap) {
      try {
        setDbMap(JSON.parse(rawMap));
        setStep(2);
      } catch {
        setDbMap({});
      }
    }

    validateNotionToken().then((info) => {
      if (info) setBotInfo(info);
    });

    setSheetId(localStorage.getItem('google_sheet_id') || '');
    setGoogleApiKey(localStorage.getItem('google_api_key') || '');
  }, []);

  const loadDatabases = async () => {
    setIsLoading(true);
    const dbs = await searchDatabases();
    setDatabases(dbs);
    setIsLoading(false);
  };

  const handleConnectNotion = async () => {
    setError(null);
    setIsLoading(true);

    const bot = await validateNotionToken();
    if (!bot) {
      setError('Notion connection failed. Check server env and auth password/session.');
      setIsLoading(false);
      return;
    }

    setBotInfo(bot);
    await loadDatabases();
    setStep(2);
    setIsLoading(false);
  };

  const handleSave = () => {
    setSaveStatus('saving');
    localStorage.setItem('notion_db_map', JSON.stringify(dbMap));
    if (dbMap.wiki) localStorage.setItem('notion_db_id', dbMap.wiki);
    localStorage.setItem('google_sheet_id', sheetId);
    localStorage.setItem('google_api_key', googleApiKey);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Integration Setup</h2>
        <p className="text-slate-500">Map each command center panel to the correct Notion database.</p>
      </div>

      <div className="flex space-x-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('notion')} className={`pb-3 px-2 text-sm font-medium border-b-2 ${activeTab === 'notion' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
          Notion Data Mapping
        </button>
        <button onClick={() => setActiveTab('sheets')} className={`pb-3 px-2 text-sm font-medium border-b-2 ${activeTab === 'sheets' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500'}`}>
          Google Sheets Data
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[420px]">
        {activeTab === 'notion' && (
          <>
            {step === 1 && (
              <div className="p-8 space-y-5 max-w-xl">
                <h3 className="text-lg font-bold text-slate-900">Connect to Notion</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                  Notion is server-managed. Ensure <code>NOTION_API_KEY</code> is set in Vercel.
                </div>
                {error && <div className="flex items-center gap-2 text-red-600 text-sm"><XCircle size={16} /> {error}</div>}
                <button onClick={handleConnectNotion} disabled={isLoading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-slate-300">
                  {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                  {isLoading ? 'Verifying...' : 'Verify and Load Databases'}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Connected as {botInfo?.name || 'Notion Bot'}</div>
                    <div className="text-xs text-slate-500">Workspace: {botInfo?.workspaceName || 'Notion'}</div>
                  </div>
                  <button onClick={loadDatabases} className="text-sm text-indigo-600 flex items-center gap-1"><RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DB_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">{field.label}</label>
                      <select
                        value={dbMap[field.key] || ''}
                        onChange={(e) => setDbMap((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        <option value="">Select database...</option>
                        {databases.map((db) => (
                          <option key={db.id} value={db.id}>{db.title}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  Tip: if a database is missing, open it in Notion and share it with your integration.
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSave} className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Mapping'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'sheets' && (
          <div className="p-8 max-w-lg space-y-6">
            <div className="flex items-start gap-4">
              <FileSpreadsheet className="text-green-600" size={28} />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Google Sheets Integration</h3>
                <p className="text-sm text-slate-500">Optional external data source.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Google Sheet ID</label>
              <input value={sheetId} onChange={(e) => setSheetId(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Google API Key</label>
              <input type="password" value={googleApiKey} onChange={(e) => setGoogleApiKey(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-lg" />
            </div>

            <div className="text-right">
              <button onClick={handleSave} className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? <span className="inline-flex items-center gap-1"><Check size={16} /> Saved</span> : 'Save Sheet Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
