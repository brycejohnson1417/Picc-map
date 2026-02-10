import React, { useState } from 'react';
import { WorkOrder, WorkOrderStatus, UserRole } from '../types';
import { MOCK_WORK_ORDERS, MOCK_DISPENSARIES } from '../constants';
import { 
  ClipboardList, 
  User, 
  Archive, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Inbox,
  ArrowRight
} from 'lucide-react';

interface WorkOrderSystemProps {
  currentUserRole: UserRole;
}

export const WorkOrderSystem: React.FC<WorkOrderSystemProps> = ({ currentUserRole }) => {
  const [view, setView] = useState<'my_bin' | 'unassigned' | 'all'>('my_bin');
  const [tickets, setTickets] = useState<WorkOrder[]>(MOCK_WORK_ORDERS);

  // Helper to get dispensary name
  const getDispensaryName = (id: string) => 
    MOCK_DISPENSARIES.find(d => d.id === id)?.name || 'Unknown Dispensary';

  // Filter logic
  const filteredTickets = tickets.filter(ticket => {
    if (view === 'my_bin') {
      return ticket.assignee === currentUserRole && ticket.status !== 'Archived';
    }
    if (view === 'unassigned') {
      return ticket.assignee === 'Unassigned' && ticket.status !== 'Archived';
    }
    return true; // 'all' view shows everything including archived
  });

  const handleStatusChange = (id: string, newStatus: WorkOrderStatus) => {
    setTickets(prev => prev.map(t => 
      t.id === id ? { ...t, status: newStatus } : t
    ));
  };

  const handleClaim = (id: string) => {
    setTickets(prev => prev.map(t => 
      t.id === id ? { ...t, assignee: currentUserRole, status: 'In Progress' } : t
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status: WorkOrderStatus) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'Archived': return <Archive size={16} className="text-slate-400" />;
      case 'New': return <AlertCircle size={16} className="text-blue-500" />;
      default: return <Clock size={16} className="text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-indigo-600" /> Work Order System
          </h1>
          <p className="text-slate-500 mt-1">Manage ticketing, proposals, and support requests.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            + New Ticket
        </button>
      </div>

      {/* Tabs / Filters */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setView('my_bin')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'my_bin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Inbox size={16} /> My Bin <span className="ml-1 bg-indigo-100 text-indigo-700 px-1.5 rounded-full text-xs">
            {tickets.filter(t => t.assignee === currentUserRole && t.status !== 'Archived').length}
          </span>
        </button>
        <button 
          onClick={() => setView('unassigned')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'unassigned' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertCircle size={16} /> Unassigned <span className="ml-1 bg-red-100 text-red-700 px-1.5 rounded-full text-xs">
            {tickets.filter(t => t.assignee === 'Unassigned' && t.status !== 'Archived').length}
          </span>
        </button>
        <button 
          onClick={() => setView('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive size={16} /> All Tickets
        </button>
      </div>

      {/* Ticket List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Ticket</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Title & Description</th>
              <th className="px-6 py-4">Dispensary</th>
              <th className="px-6 py-4">Assignee</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList size={32} className="opacity-20" />
                    <p>No work orders found in this view.</p>
                  </div>
                </td>
              </tr>
            ) : filteredTickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{ticket.ticketNumber}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(ticket.status)}
                    <span className="font-medium text-slate-700">{ticket.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wide ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] border border-slate-200 uppercase tracking-wide">
                      {ticket.type}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">{ticket.title}</div>
                  <div className="truncate text-slate-500 mt-0.5" title={ticket.description}>{ticket.description}</div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-700">
                  {getDispensaryName(ticket.dispensaryId)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        ticket.assignee === 'Unassigned' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      <User size={12} />
                    </div>
                    <span>{ticket.assignee}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {ticket.assignee === 'Unassigned' ? (
                    <button 
                      onClick={() => handleClaim(ticket.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 hover:border-indigo-400 bg-indigo-50 px-3 py-1.5 rounded transition-all"
                    >
                      Claim Ticket
                    </button>
                  ) : ticket.status !== 'Completed' && ticket.status !== 'Archived' ? (
                     <button 
                      onClick={() => handleStatusChange(ticket.id, 'Completed')}
                      className="text-emerald-600 hover:text-emerald-800 font-medium text-xs border border-emerald-200 hover:border-emerald-400 bg-emerald-50 px-3 py-1.5 rounded transition-all"
                    >
                      Mark Complete
                    </button>
                  ) : (
                    <span className="text-slate-400 text-xs">No actions</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
