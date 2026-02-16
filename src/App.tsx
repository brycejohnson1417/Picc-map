import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { NotionDocList } from './components/NotionDocList';
import { AICopilot } from './components/AICopilot';
import { Settings } from './components/Settings';
import { ServiceWorkspace } from './components/ServiceWorkspace';
import { CustomerPortal } from './components/CustomerPortal';
import { PPPOnboarding } from './components/PPPOnboarding';
import { AdminDashboard } from './components/AdminDashboard';
import { ProposalBuilder } from './components/ProposalBuilder';
import { SalesCRM } from './components/SalesCRM';
import { UserRole } from './types';
import { MOCK_NOTION_PAGES } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.SALES_REP);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        setIsAuthed(res.ok);
      } catch {
        setIsAuthed(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Login failed' }));
        setAuthError(data.error || 'Login failed');
        return;
      }

      setIsAuthed(true);
      setPassword('');
    } catch {
      setAuthError('Network error while logging in');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthed(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">
        Checking access...
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
          <h1 className="text-xl font-semibold text-slate-900">PICC Intranet Sign In</h1>
          <p className="text-sm text-slate-500">Enter the shared access password.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            placeholder="Password"
            autoFocus
            required
          />
          {authError && <div className="text-sm text-red-600">{authError}</div>}
          <button type="submit" className="w-full bg-slate-900 text-white rounded-lg py-2 hover:bg-slate-800">
            Sign In
          </button>
        </form>
      </div>
    );
  }

  if (activeTab === 'customer-portal') {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg text-sm hover:bg-slate-800"
          >
            Return to Internal Workspace
          </button>
        </div>
        <CustomerPortal />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentRole={userRole} />;
      case 'service-center':
        return <ServiceWorkspace currentUserRole={userRole} />;
      case 'ppp':
        return <PPPOnboarding />;
      case 'wiki':
        return <NotionDocList docs={MOCK_NOTION_PAGES} />;
      case 'settings':
        return <Settings />;
      case 'admin':
        return <AdminDashboard />;
      case 'proposals':
        return <ProposalBuilder />;
      case 'sales':
        return <SalesCRM />;
      case 'finance':
      case 'team':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🚧</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Module Under Construction</h2>
            <p className="text-slate-500 max-w-md">
              The <strong>{activeTab}</strong> module is currently being connected to the new API.
              Please check the Notion Wiki for interim processes or ask the AI Assistant for help.
            </p>
          </div>
        );
      default:
        return <Dashboard currentRole={userRole} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        currentRole={userRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setRole={setUserRole}
      />

      <main className="flex-1 ml-64 p-8 overflow-x-hidden">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
        {renderContent()}
      </main>

      <AICopilot />
    </div>
  );
};

export default App;
