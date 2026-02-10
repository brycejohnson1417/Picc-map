import React, { useState, useEffect } from 'react';
import { Save, Check, AlertCircle, Database, Key, Wifi, XCircle, ArrowRight, RefreshCw, ChevronRight, Search, ShieldCheck, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { validateNotionToken, searchDatabases } from '../services/notionService';
import { NotionDatabase, NotionBot } from '../types';

export const Settings: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<'notion' | 'sheets'>('notion');
  
  // Notion State
  const [apiKey, setApiKey] = useState('');
  const [dbId, setDbId] = useState('');
  const [botInfo, setBotInfo] = useState<NotionBot | null>(null);
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  
  // Google Sheets State
  const [sheetId, setSheetId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    // Load Notion
    const storedKey = localStorage.getItem('notion_api_key');
    const storedDb = localStorage.getItem('notion_db_id');
    if (storedKey) {
        setApiKey(storedKey);
        validateNotionToken(storedKey).then(result => {
            if (result.success && result.bot) setBotInfo(result.bot);
        });
    }
    if (storedDb) setDbId(storedDb);

    // Load Sheets
    setSheetId(localStorage.getItem('google_sheet_id') || '');
    setGoogleApiKey(localStorage.getItem('google_api_key') || '');
  }, []);

  const handleConnectNotion = async () => {
    setError(null);
    setIsLoading(true);
    
    const result = await validateNotionToken(apiKey);
    
    if (!result.success) {
        setError(result.error || "Connection failed. Is the backend server running?");
        setIsLoading(false);
        return;
    }
    
    if (result.bot) setBotInfo(result.bot);

    const dbs = await searchDatabases(apiKey);
    setDatabases(dbs);
    setStep(2);
    setIsLoading(false);
  };

  const handleRefreshDatabases = async () => {
    setIsLoading(true);
    const dbs = await searchDatabases(apiKey);
    setDatabases(dbs);
    setIsLoading(false);
  };

  const handleSelectDatabase = (id: string) => {
    setDbId(id);
  };

  const handleSheetIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Simple regex to extract ID from URL if user pastes full URL
      const match = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
          setSheetId(match[1]);
      } else {
          setSheetId(val);
      }
  };

  const handleFinalSave = () => {
    setSaveStatus('saving');
    localStorage.setItem('notion_api_key', apiKey);
    localStorage.setItem('notion_db_id', dbId);
    
    // Save Google Sheets
    localStorage.setItem('google_sheet_id', sheetId);
    localStorage.setItem('google_api_key', googleApiKey);
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  const resetFlow = () => {
      setStep(1);
      setError(null);
      setDatabases([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Integration Setup</h2>
        <p className="text-slate-500">Connect your knowledge base and data sources.</p>
      </div>

      <div className="flex space-x-4 border-b border-slate-200">
        <button
            onClick={() => setActiveTab('notion')}
            className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'notion' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Notion Knowledge Base
        </button>
        <button
            onClick={() => setActiveTab('sheets')}
            className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'sheets' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            Google Sheets Data
        </button>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        
        {/* === NOTION TAB === */}
        {activeTab === 'notion' && (
            <>
                {step === 1 && (
                    <div className="p-8">
                        <div className="flex items-start gap-6 mb-8">
                            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-4xl shadow-sm border border-slate-200">
                                N
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Connect to Notion</h3>
                                <p className="text-slate-500 text-sm mt-1 max-w-xl leading-relaxed">
                                    Create an Internal Integration in Notion to generate a secret token. 
                                    This allows the PICC Platform to securely read and write to your workspace.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 max-w-lg">
                            <label className="block text-sm font-semibold text-slate-700">Internal Integration Secret</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="password" 
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="secret_..."
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
                                />
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                                    <XCircle size={16} /> 
                                    <span className="flex-1">{error}</span>
                                </div>
                            )}

                            <button 
                                onClick={handleConnectNotion}
                                disabled={!apiKey || isLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all mt-4"
                            >
                                {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                                {isLoading ? 'Verifying...' : 'Verify & Continue'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                {botInfo?.icon && (
                                    <img src={botInfo.icon} alt="Bot" className="w-10 h-10 rounded-full border border-slate-200 bg-white" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                )}
                                <div>
                                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        Connected as {botInfo?.name}
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full uppercase tracking-wider">Active</span>
                                    </div>
                                    <div className="text-xs text-slate-500">Workspace: {botInfo?.workspaceName || 'Notion'}</div>
                                </div>
                            </div>
                            <button onClick={resetFlow} className="text-slate-400 hover:text-slate-600 text-sm underline">Change Token</button>
                        </div>

                        <div className="p-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Select Primary Database</h3>
                            {databases.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {databases.map((db) => (
                                        <div 
                                            key={db.id}
                                            onClick={() => handleSelectDatabase(db.id)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                                                dbId === db.id 
                                                    ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="text-2xl">{db.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-semibold truncate ${dbId === db.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                    {db.title}
                                                </h4>
                                                <div className="text-xs text-slate-400 mt-1 truncate">ID: {db.id}</div>
                                            </div>
                                            {dbId === db.id && <Check className="text-indigo-600 shrink-0" size={20} />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center mb-6">
                                    <p className="text-sm text-amber-800">No shared databases found. Please share a database with your integration in Notion.</p>
                                </div>
                            )}
                            <div className="flex justify-between items-center border-t border-slate-100 pt-6">
                                <button onClick={handleRefreshDatabases} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh List
                                </button>
                                <button onClick={handleFinalSave} disabled={!dbId} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-slate-300">
                                    {saveStatus === 'saved' ? <><Check size={18} /> Saved</> : 'Save Configuration'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}

        {/* === SHEETS TAB === */}
        {activeTab === 'sheets' && (
            <div className="p-8">
                <div className="flex items-start gap-6 mb-8">
                    <div className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shadow-sm border border-green-100">
                        <FileSpreadsheet size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Google Sheets Integration</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-xl leading-relaxed">
                            Connect a Google Sheet to pull live data for Work Orders and Dispensaries.
                            You will need a Google Cloud API Key with "Google Sheets API" enabled.
                        </p>
                    </div>
                </div>

                <div className="space-y-6 max-w-lg">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Google Sheet ID or URL</label>
                        <div className="text-[10px] text-slate-400 mb-2">Paste the full URL or just the ID (e.g. 1BxiM...EgyJo4)</div>
                        <input 
                            type="text" 
                            value={sheetId}
                            onChange={handleSheetIdChange}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Google API Key</label>
                        <input 
                            type="password" 
                            value={googleApiKey}
                            onChange={(e) => setGoogleApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-mono text-sm"
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-2">
                        <p className="font-semibold flex items-center gap-1"><AlertCircle size={12} className="text-amber-500" /> Important Requirement:</p>
                        <p>
                            Because we are using an API Key, your Google Sheet must be set to <strong>"Anyone with the link"</strong> can <strong>View</strong>. 
                            If your company policy forbids this, you must use a Service Account (requires backend changes).
                        </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 text-right">
                        <button 
                            onClick={handleFinalSave} 
                            className={`px-8 py-3 rounded-lg font-medium text-white transition-all shadow-md ${
                            saveStatus === 'saved' 
                                ? 'bg-emerald-500 hover:bg-emerald-600' 
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? <><Check size={18} /> Saved</> : 'Save Sheet Settings'}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};