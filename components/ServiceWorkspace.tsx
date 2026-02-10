import React, { useState } from 'react';
import { WorkOrder, UserRole, WorkOrderStatus } from '../types';
import { MOCK_WORK_ORDERS } from '../constants';
import { 
  Inbox, 
  User, 
  Phone, 
  Mail, 
  MessageSquare, 
  Slack, 
  Instagram, 
  Smile, 
  Meh, 
  Frown, 
  Sparkles, 
  Clock, 
  CheckCircle2,
  MoreHorizontal,
  Plus
} from 'lucide-react';

interface ServiceWorkspaceProps {
  currentUserRole: UserRole;
}

export const ServiceWorkspace: React.FC<ServiceWorkspaceProps> = ({ currentUserRole }) => {
  const [activeTab, setActiveTab] = useState<'support' | 'hr'>('support');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(MOCK_WORK_ORDERS[0].id);
  const [tickets, setTickets] = useState<WorkOrder[]>(MOCK_WORK_ORDERS);

  // Filter Logic
  const filteredTickets = tickets.filter(t => {
    if (activeTab === 'support') return t.type !== 'HR Request';
    if (activeTab === 'hr') return t.type === 'HR Request';
    return true;
  });

  const selectedTicket = tickets.find(t => t.id === selectedCaseId);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'Email': return <Mail size={14} />;
      case 'Slack': return <Slack size={14} />;
      case 'Phone': return <Phone size={14} />;
      case 'Instagram': return <Instagram size={14} />;
      default: return <MessageSquare size={14} />;
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return <Smile size={16} className="text-emerald-500" />;
      case 'Negative': return <Frown size={16} className="text-red-500" />;
      default: return <Meh size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             Service Center
           </h1>
           <p className="text-xs text-slate-500">Omnichannel Agent Workspace</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
             <Phone size={16} /> Log Call
           </button>
           <button className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
             <Plus size={16} /> New Case
           </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        
        {/* Left: Case List */}
        <div className="w-80 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
           <div className="flex border-b border-slate-100">
             <button 
               onClick={() => setActiveTab('support')}
               className={`flex-1 py-3 text-sm font-medium ${activeTab === 'support' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Customer Support
             </button>
             <button 
               onClick={() => setActiveTab('hr')}
               className={`flex-1 py-3 text-sm font-medium ${activeTab === 'hr' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
               HR & Internal
             </button>
           </div>
           <div className="p-2 bg-slate-50 border-b border-slate-100">
              <input type="text" placeholder="Filter cases..." className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs" />
           </div>
           <div className="flex-1 overflow-y-auto">
             {filteredTickets.map(ticket => (
               <div 
                 key={ticket.id}
                 onClick={() => setSelectedCaseId(ticket.id)}
                 className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedCaseId === ticket.id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
               >
                 <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-mono text-slate-500">{ticket.ticketNumber}</span>
                    <span className="text-[10px] text-slate-400">{ticket.dateCreated}</span>
                 </div>
                 <h4 className={`text-sm font-medium mb-1 ${selectedCaseId === ticket.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                   {ticket.title}
                 </h4>
                 <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                       {getChannelIcon(ticket.channel)} {ticket.channel}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${ticket.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-slate-50'}`}>
                       {ticket.priority}
                    </span>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Middle: Active Case Detail */}
        {selectedTicket ? (
          <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
             {/* Case Header */}
             <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                         {getChannelIcon(selectedTicket.channel)}
                      </div>
                      <div>
                         <h2 className="text-xl font-bold text-slate-900">{selectedTicket.title}</h2>
                         <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span>Case {selectedTicket.ticketNumber}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                               <User size={14} /> {selectedTicket.requesterName}
                            </span>
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-2 mt-4">
                      <button className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium text-slate-700 transition-colors">Details</button>
                      <button className="px-4 py-1.5 text-slate-500 hover:text-slate-700 rounded text-sm font-medium transition-colors">Activity Feed</button>
                      <button className="px-4 py-1.5 text-slate-500 hover:text-slate-700 rounded text-sm font-medium transition-colors">Attachments</button>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      selectedTicket.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                      selectedTicket.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 border-slate-200'
                   }`}>
                      {selectedTicket.status}
                   </div>
                   <div className="text-xs text-slate-400 flex items-center gap-1">
                      Assigned to: <span className="text-slate-700 font-medium">{selectedTicket.assignee}</span>
                   </div>
                </div>
             </div>

             {/* Case Body */}
             <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-6">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Description</h3>
                   <p className="text-slate-700 leading-relaxed">{selectedTicket.description}</p>
                </div>
                
                {/* Simulated Conversation */}
                <div className="space-y-6">
                   <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                         {selectedTicket.requesterName.charAt(0)}
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-baseline mb-1">
                            <span className="font-bold text-slate-800 text-sm">{selectedTicket.requesterName}</span>
                            <span className="text-xs text-slate-400">Oct 27, 2:30 PM</span>
                         </div>
                         <div className="bg-white border border-slate-200 p-4 rounded-lg rounded-tl-none text-slate-700 text-sm shadow-sm">
                            I've been trying to connect for 3 days now. This is impacting our Q4 rollout.
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Footer Actions */}
             <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2">
                   <input type="text" placeholder="Write a reply..." className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500" />
                   <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">Reply</button>
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">Select a case to view details</div>
        )}

        {/* Right: Agent Assist Sidebar */}
        {selectedTicket && (
          <div className="w-72 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm">
             <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                   <Sparkles size={16} /> Agent Assist AI
                </div>
             </div>
             
             <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                {/* Sentiment */}
                <div>
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Sentiment Analysis</h4>
                   <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      {getSentimentIcon(selectedTicket.sentiment)}
                      <span className="text-sm font-medium text-slate-700">{selectedTicket.sentiment}</span>
                   </div>
                </div>

                {/* AI Summary */}
                <div>
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Smart Summary</h4>
                   <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-900 leading-relaxed">
                      {selectedTicket.aiSummary}
                   </div>
                </div>

                {/* Next Best Action */}
                <div>
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Next Best Action</h4>
                   <div className="space-y-2">
                      <button className="w-full text-left p-2 hover:bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 transition-colors">
                         Send Article: "Troubleshooting API Keys"
                      </button>
                      <button className="w-full text-left p-2 hover:bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 transition-colors">
                         Escalate to Level 2 Support
                      </button>
                   </div>
                </div>

                {/* Customer Details */}
                 <div>
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Customer Profile</h4>
                   <div className="text-xs space-y-2 text-slate-600">
                      <div className="flex justify-between">
                         <span>LTV:</span>
                         <span className="font-medium text-slate-800">$12,500</span>
                      </div>
                      <div className="flex justify-between">
                         <span>Plan:</span>
                         <span className="font-medium text-slate-800">Enterprise</span>
                      </div>
                      <div className="flex justify-between">
                         <span>Satisfaction:</span>
                         <span className="font-medium text-emerald-600">92%</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};