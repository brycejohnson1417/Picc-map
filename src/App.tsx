import React, { useState } from 'react';
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
import { UserRole } from './types';
import { MOCK_NOTION_PAGES } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.SALES_REP);

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
        {renderContent()}
      </main>

      <AICopilot />
    </div>
  );
};

export default App;
