import React, { useEffect, useState } from 'react';
import { ExternalLink, Clock, Hash, AlertTriangle, RefreshCw, Plus, FilePlus, Check } from 'lucide-react';
import { NotionPage } from '../types';
import { MOCK_NOTION_PAGES } from '../constants';
import { createNotionPage, getNotionDocs } from '../services/notionService';

export const NotionDocList: React.FC = () => {
  const [docs, setDocs] = useState<NotionPage[]>(MOCK_NOTION_PAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'mock'>('mock');
  
  const [isCreating, setIsCreating] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageCategory, setNewPageCategory] = useState<NotionPage['category']>('General');

  const fetchDocs = async () => {
    setIsLoading(true);
    setError(null);
    const result = await getNotionDocs();
    setDocs(result.docs.length ? result.docs : MOCK_NOTION_PAGES);
    setDataSource(result.source);
    if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) {
      return;
    }
    setIsLoading(true);
    const result = await createNotionPage({
      title: newPageTitle,
      category: newPageCategory,
      icon: '✨',
      content: 'Draft content created from PICC Intranet.'
    });

    if (result.success) {
      setNewPageTitle('');
      setIsCreating(false);
      await fetchDocs();
    } else {
      setError(result.error || 'Failed to create page');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-3xl">📚</span> Knowledge Base
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            Source: {dataSource === 'api' ? <span className="text-emerald-600 font-bold">Live Notion API</span> : 'Simulated Data'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDocs}
            className={`p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 transition-all ${isLoading ? 'animate-spin' : ''}`}
            title="Sync Now"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} /> New Page
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
            <FilePlus size={18} /> Create New Notion Page
          </h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
              <input
                type="text"
                value={newPageTitle}
                onChange={(event) => setNewPageTitle(event.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., Q4 Guidelines"
              />
            </div>
            <div className="w-48 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
              <select
                value={newPageCategory}
                onChange={(event) => setNewPageCategory(event.target.value as NotionPage['category'])}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="General">General</option>
                <option value="Policy">Policy</option>
                <option value="Sales Asset">Sales Asset</option>
                <option value="Event">Event</option>
                <option value="Meeting Notes">Meeting Notes</option>
                <option value="Financial Report">Financial Report</option>
              </select>
            </div>
            <button
              onClick={handleCreatePage}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium h-9 flex items-center"
            >
              {isLoading ? 'Saving...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="group bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-indigo-300 relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-3">
              <span className="text-4xl">{doc.icon}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                doc.category === 'Policy' ? 'bg-red-100 text-red-700' :
                doc.category === 'Sales Asset' ? 'bg-green-100 text-green-700' :
                doc.category === 'Financial Report' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {doc.category}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
              {doc.title}
            </h3>

            <p className="text-slate-500 text-sm line-clamp-3 mb-4">
              {doc.content}
            </p>

            <div className="flex items-center justify-between text-xs text-slate-400 mt-auto pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{doc.lastEdited}</span>
              </div>
              <div className="flex items-center gap-2">
                {doc.syncStatus === 'synced' && (
                  <div title="Synced with Notion">
                    <Check size={12} className="text-emerald-500" />
                  </div>
                )}
                {doc.tags?.slice(0, 2).map((tag) => (
                  <span key={tag} className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded">
                    <Hash size={10} className="text-slate-400" /> {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink size={16} className="text-indigo-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
