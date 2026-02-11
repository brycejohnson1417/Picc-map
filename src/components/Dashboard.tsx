import React from 'react';
import { UserRole } from '../types';
import { SALES_METRICS } from '../constants';
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Calendar, Briefcase } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DashboardProps {
  currentRole: UserRole;
}

const data = [
  { name: 'Jan', uv: 4000, pv: 2400, amt: 2400 },
  { name: 'Feb', uv: 3000, pv: 1398, amt: 2210 },
  { name: 'Mar', uv: 2000, pv: 9800, amt: 2290 },
  { name: 'Apr', uv: 2780, pv: 3908, amt: 2000 },
  { name: 'May', uv: 1890, pv: 4800, amt: 2181 },
  { name: 'Jun', uv: 2390, pv: 3800, amt: 2500 },
  { name: 'Jul', uv: 3490, pv: 4300, amt: 2100 },
];

export const Dashboard: React.FC<DashboardProps> = ({ currentRole }) => {
  const metrics = SALES_METRICS[currentRole];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {currentRole}</h1>
          <p className="text-slate-500">Here's what's happening at PICC Platform today.</p>
        </div>
        <div className="text-sm text-slate-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">{metric.name}</span>
              <div className={`p-2 rounded-lg ${
                idx === 0 ? 'bg-indigo-50 text-indigo-600' :
                idx === 1 ? 'bg-blue-50 text-blue-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>
                {idx === 0 ? <DollarSign size={20} /> : idx === 1 ? <Users size={20} /> : <Calendar size={20} />}
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-2">
                {metric.value.toLocaleString()}
                {metric.name.includes('Rate') || metric.name.includes('Margin') ? '%' : ''}
              </div>
              <div className={`flex items-center text-sm font-medium ${
                metric.trend === 'up' ? 'text-emerald-600' :
                metric.trend === 'down' ? 'text-red-600' :
                'text-slate-500'
              }`}>
                {metric.trend === 'up' ? <TrendingUp size={16} className="mr-1" /> :
                  metric.trend === 'down' ? <TrendingDown size={16} className="mr-1" /> :
                    <Minus size={16} className="mr-1" />}
                {Math.abs(metric.change)}% vs last month
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Performance Overview</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="uv" stroke="#6366f1" fillOpacity={1} fill="url(#colorUv)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
          <div className="space-y-3 flex-1">
            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <DollarSign size={16} />
              </div>
              <div>
                <div className="font-medium text-slate-800">Submit Expense</div>
                <div className="text-xs text-slate-500">Finance Portal</div>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Briefcase size={16} />
              </div>
              <div>
                <div className="font-medium text-slate-800">New Deal Lead</div>
                <div className="text-xs text-slate-500">Salesforce CRM</div>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Users size={16} />
              </div>
              <div>
                <div className="font-medium text-slate-800">Refer Ambassador</div>
                <div className="text-xs text-slate-500">HR Portal</div>
              </div>
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Recent Updates</div>
            <div className="text-sm text-slate-600">
              <p className="mb-2">🎉 <span className="font-medium text-slate-900">Sarah J.</span> closed a $50k deal!</p>
              <p>📢 New marketing assets uploaded to Notion.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
