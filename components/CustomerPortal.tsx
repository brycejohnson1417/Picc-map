import React, { useState } from 'react';
import { Search, ChevronRight, FileText, MessageCircle, HelpCircle, Package, ArrowRight } from 'lucide-react';
import { MOCK_NOTION_PAGES, MOCK_WORK_ORDERS } from '../constants';

export const CustomerPortal: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Simulate "My Cases" for a logged-in customer user
  const myCases = MOCK_WORK_ORDERS.slice(0, 3);
  const kbArticles = MOCK_NOTION_PAGES.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Hero Section */}
      <div className="bg-teal-700 text-white pb-24">
        <div className="max-w-6xl mx-auto px-6 pt-8">
          <div className="flex justify-between items-center mb-16">
            <div className="font-bold text-2xl tracking-tight">PICC Connect</div>
            <div className="flex gap-6 text-sm font-medium">
              <a href="#" className="hover:text-teal-200 transition-colors">Home</a>
              <a href="#" className="hover:text-teal-200 transition-colors">Community</a>
              <a href="#" className="hover:text-teal-200 transition-colors">Support</a>
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center border border-teal-500">
                    JD
                 </div>
              </div>
            </div>
          </div>

          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-6">How can we help you?</h1>
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for answers, articles, or services..."
                className="w-full py-4 pl-12 pr-4 rounded-full text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/30 shadow-lg"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
            <p className="mt-4 text-teal-100 text-sm">Popular: API Keys, Billing, Mobile App Setup</p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="max-w-6xl mx-auto px-6 -mt-16">
        <div className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
          
          {/* Left: Content Area */}
          <div className="flex-1 p-8 md:p-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">We are here to help.</h2>
            <p className="text-slate-500 mb-8">Browse our knowledge base or manage your ongoing requests.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
               <div>
                 <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-teal-600" /> Latest Articles
                 </h3>
                 <div className="space-y-3">
                   {kbArticles.map(article => (
                     <div key={article.id} className="group cursor-pointer">
                       <div className="text-sm font-medium text-slate-700 group-hover:text-teal-600 transition-colors">
                         {article.title}
                       </div>
                       <div className="text-xs text-slate-400 mt-1 line-clamp-1">{article.content}</div>
                       <div className="h-px bg-slate-100 mt-2" />
                     </div>
                   ))}
                 </div>
                 <button className="mt-4 text-teal-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                    View All Articles <ArrowRight size={14} />
                 </button>
               </div>

               <div>
                 <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Package size={18} className="text-teal-600" /> My Recent Cases
                 </h3>
                 <div className="space-y-3">
                   {myCases.map(ticket => (
                     <div key={ticket.id} className="p-3 border border-slate-100 rounded-lg hover:border-teal-200 transition-colors bg-slate-50/50">
                       <div className="flex justify-between items-start">
                         <span className="text-xs font-mono text-slate-500">{ticket.ticketNumber}</span>
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                           ticket.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                         }`}>
                           {ticket.status}
                         </span>
                       </div>
                       <div className="text-sm font-medium text-slate-800 mt-1">{ticket.title}</div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>

            <div className="bg-teal-50 rounded-xl p-6 flex justify-between items-center">
               <div>
                  <h3 className="font-bold text-teal-900">Still need help?</h3>
                  <p className="text-sm text-teal-700">Our support team is available 24/7 via chat or email.</p>
               </div>
               <button className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors">
                  Contact Support
               </button>
            </div>
          </div>

          {/* Right: Self-Service Sidebar */}
          <div className="w-full md:w-80 bg-slate-50 border-l border-slate-100 p-8">
            <div className="bg-pink-600 text-white p-6 rounded-xl mb-8">
               <h3 className="font-bold text-lg mb-2">Help Center</h3>
               <p className="text-sm opacity-90 mb-4">
                 Kick off your self-service experience by launching a custom help center—no coding needed.
               </p>
               <button className="w-full bg-white text-pink-700 py-2 rounded-lg text-sm font-bold hover:bg-pink-50 transition-colors">
                  Start Guide
               </button>
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Quick Actions</h4>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-teal-400 transition-colors flex items-center gap-3">
                 <MessageCircle size={16} className="text-teal-600" /> Submit Ticket
              </button>
              <button className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-teal-400 transition-colors flex items-center gap-3">
                 <HelpCircle size={16} className="text-teal-600" /> Reset Password
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {/* Footer */}
      <div className="max-w-6xl mx-auto px-6 py-12 text-center text-slate-400 text-sm">
         © 2024 PICC Platform. All rights reserved.
      </div>
    </div>
  );
};