import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, ShieldAlert, Target, Users } from 'lucide-react';
import { UserRole } from '../types';
import { loadCommandCenterMetrics, type CommandCenterMetrics } from '../services/commandCenterService';
import { loadBAOpsData, type BAOpsData } from '../services/baOpsService';
import { loadFinanceReportData, type FinanceReportData } from '../services/moduleDataService';
import { loadCRMRecords, type CRMRecord } from '../services/crmService';

interface DashboardProps {
  currentRole: UserRole;
}

const EMPTY_METRICS: CommandCenterMetrics = {
  customers: 0,
  leads: 0,
  openWorkOrders: 0,
  pendingVendorSubmissions: 0,
  activeInventorySkus: 0,
  recentUpdates: [],
  dbMap: {},
  source: 'fallback',
};

const EMPTY_BA: BAOpsData = {
  needsScheduling: [],
  inProgress: [],
  awaitingReports: [],
  overdueFollowUps: [],
  lastRefreshed: new Date().toISOString(),
  source: 'fallback',
};

const EMPTY_FINANCE: FinanceReportData = {
  rows: [],
  totals: { revenue: 0, expenses: 0, net: 0 },
  source: 'fallback',
  lastRefreshed: new Date().toISOString(),
};

const isSchedulingStatus = (status: string): boolean => ['not_started', 'asap', 'to_schedule', 'unscheduled'].some((k) => status.includes(k));
const isAwaitingStatus = (status: string): boolean => ['awaiting_reports', 'report_pending', 'submitted'].some((k) => status.includes(k));
const isInProgressStatus = (status: string): boolean => ['in_progress', 'scheduled', 'active', 'ongoing'].some((k) => status.includes(k));
const isPendingStatus = (status: string): boolean => status.toLowerCase().includes('pending');
const REFERRAL_KEYWORDS = ['referral', 'referred', 'pending referral'];
const SAMPLE_KEYWORDS = ['sample', 'trial box', 'trial', 'sample box', 'demo box'];
const PIPELINE_PENDING_KEYWORDS = ['pending', 'awaiting', 'requested', 'to send', 'needs'];
const PIPELINE_CLOSED_KEYWORDS = ['complete', 'completed', 'closed', 'sent', 'delivered', 'received'];

const daysSince = (iso?: string): number => {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
};

const crmRowCorpus = (row: CRMRecord): string => {
  const allProps = row.properties.map((prop) => `${prop.name} ${prop.value}`).join(' ');
  return `${row.name} ${row.accountStatus} ${row.vendorDayStatus} ${allProps}`.toLowerCase();
};

const MetricCard: React.FC<{ label: string; value: string | number; tone?: 'default' | 'good' | 'warn' | 'danger' }> = ({ label, value, tone = 'default' }) => {
  const toneClass =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-slate-200 bg-white text-slate-800';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
};

const QueueList: React.FC<{
  title: string;
  subtitle?: string;
  items: Array<{ title: string; meta: string; action?: string }>;
  empty: string;
}> = ({ title, subtitle, items, empty }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4">
    <h3 className="font-semibold text-slate-900">{title}</h3>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    <div className="mt-3 space-y-2">
      {items.length === 0 ? (
        <div className="text-sm text-slate-500">{empty}</div>
      ) : (
        items.slice(0, 10).map((item, i) => (
          <div key={`${item.title}-${i}`} className="rounded-lg border border-slate-100 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-slate-800">{item.title}</div>
              {item.action && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-slate-100 text-slate-700">{item.action}</span>}
            </div>
            <div className="text-xs text-slate-500 mt-1">{item.meta}</div>
          </div>
        ))
      )}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ currentRole }) => {
  const [metrics, setMetrics] = useState<CommandCenterMetrics>(EMPTY_METRICS);
  const [baOps, setBaOps] = useState<BAOpsData>(EMPTY_BA);
  const [finance, setFinance] = useState<FinanceReportData>(EMPTY_FINANCE);
  const [crmRows, setCrmRows] = useState<CRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRep, setActiveRep] = useState(localStorage.getItem('picc.activeRep') || '');

  const refresh = async () => {
    setLoading(true);
    const [m, b, f, c] = await Promise.all([loadCommandCenterMetrics(), loadBAOpsData(), loadFinanceReportData(), loadCRMRecords()]);
    setMetrics(m);
    setBaOps(b);
    setFinance(f);
    setCrmRows(c);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (activeRep) localStorage.setItem('picc.activeRep', activeRep);
  }, [activeRep]);

  const reps = useMemo(() => Array.from(new Set(crmRows.map((r) => r.rep).filter((r) => r && r !== 'Unassigned'))).sort(), [crmRows]);

  const opsStats = useMemo(() => {
    const needsScheduling = crmRows.filter((r) => isSchedulingStatus(r.vendorDayStatusNormalized));
    const awaiting = crmRows.filter((r) => isAwaitingStatus(r.vendorDayStatusNormalized));
    const inProgress = crmRows.filter((r) => isInProgressStatus(r.vendorDayStatusNormalized));
    const done = crmRows.filter((r) => r.vendorDayStatusNormalized.includes('done'));
    const unassigned = crmRows.filter((r) => r.rep === 'Unassigned');
    const stale = crmRows.filter((r) => daysSince(r.lastEdited) > 14);
    return { needsScheduling, awaiting, inProgress, done, unassigned, stale };
  }, [crmRows]);

  const myRows = useMemo(() => (activeRep ? crmRows.filter((r) => r.rep === activeRep) : []), [crmRows, activeRep]);

  const referralSample = useMemo(() => {
    const scopedRows = currentRole === UserRole.SALES_REP && activeRep ? crmRows.filter((row) => row.rep === activeRep) : crmRows;

    const queue = scopedRows
      .map((row) => {
        const corpus = crmRowCorpus(row);
        const hasReferral = REFERRAL_KEYWORDS.some((keyword) => corpus.includes(keyword));
        const hasSample = SAMPLE_KEYWORDS.some((keyword) => corpus.includes(keyword));
        if (!hasReferral && !hasSample) return null;

        const hasPending = PIPELINE_PENDING_KEYWORDS.some((keyword) => corpus.includes(keyword));
        const hasClosed = PIPELINE_CLOSED_KEYWORDS.some((keyword) => corpus.includes(keyword)) || row.vendorDayStatusNormalized.includes('done');

        let stage: 'Pending' | 'Active' | 'Closed' = 'Active';
        if (hasClosed) stage = 'Closed';
        if (hasPending || row.vendorDayStatusNormalized.includes('awaiting') || row.vendorDayStatusNormalized.includes('not_started')) stage = 'Pending';

        return {
          title: row.name,
          stage,
          tags: [hasReferral ? 'Referral' : null, hasSample ? 'Sample' : null].filter(Boolean).join(' + '),
          meta: `${row.rep} • ${row.city}`,
          staleDays: daysSince(row.lastEdited),
        };
      })
      .filter((item): item is { title: string; stage: 'Pending' | 'Active' | 'Closed'; tags: string; meta: string; staleDays: number } => Boolean(item))
      .sort((a, b) => {
        const rank = { Pending: 0, Active: 1, Closed: 2 };
        const stageDiff = rank[a.stage] - rank[b.stage];
        if (stageDiff !== 0) return stageDiff;
        return b.staleDays - a.staleDays;
      });

    return {
      referralCount: queue.filter((item) => item.tags.includes('Referral')).length,
      sampleCount: queue.filter((item) => item.tags.includes('Sample')).length,
      pendingCount: queue.filter((item) => item.stage === 'Pending').length,
      queue: queue.filter((item) => item.stage !== 'Closed').slice(0, 6),
    };
  }, [crmRows, currentRole, activeRep]);

  const warningMessages = [metrics.source === 'fallback' ? 'Command center metrics are in fallback mode.' : '', baOps.warning || '', finance.warning || '']
    .filter(Boolean)
    .slice(0, 2);

  const roleHeader = {
    [UserRole.AMBASSADOR]: 'Brand Ambassador Mission Board',
    [UserRole.SALES_OPS]: 'Sales Ops Control Tower',
    [UserRole.SALES_REP]: 'Sales Rep Action Desk',
    [UserRole.FINANCE]: 'Finance Decision View',
    [UserRole.ADMIN]: 'Platform Oversight',
  }[currentRole];

  const roleSubheader = {
    [UserRole.AMBASSADOR]: 'Today-first queues: schedule, execute, report, and close loops fast.',
    [UserRole.SALES_OPS]: 'Surface bottlenecks, ownership gaps, and stalled execution.',
    [UserRole.SALES_REP]: 'Prioritize accounts that need your immediate follow-up.',
    [UserRole.FINANCE]: 'Track cash-impacting items and team revenue momentum.',
    [UserRole.ADMIN]: 'Monitor data health, system reliability, and cross-team risk.',
  }[currentRole];

  const renderRoleView = () => {
    if (currentRole === UserRole.AMBASSADOR) {
      return (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <MetricCard label="Needs Scheduling" value={baOps.needsScheduling.length} tone="warn" />
            <MetricCard label="In Progress" value={baOps.inProgress.length} tone="default" />
            <MetricCard label="Reports Due" value={baOps.awaitingReports.length} tone="warn" />
            <MetricCard label="Overdue Escalations" value={baOps.overdueFollowUps.length} tone="danger" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <QueueList
              title="Do Today"
              subtitle="Schedule first, then execute, then close reports"
              items={[
                ...baOps.needsScheduling.map((x) => ({ title: x.storeName, action: 'Schedule', meta: `${x.rep} • ${x.city}` })),
                ...baOps.inProgress.map((x) => ({ title: x.storeName, action: 'Check-In', meta: `${x.rep} • ${x.city}` })),
                ...baOps.awaitingReports.map((x) => ({ title: x.storeName, action: 'Get Report', meta: `${x.rep} • ${x.city}` })),
              ]}
              empty="No immediate work queued for today."
            />
            <QueueList
              title="Overdue escalations"
              subtitle="Fix these first"
              items={baOps.overdueFollowUps.map((x) => ({ title: x.storeName, action: 'Escalate', meta: `${x.rep} • ${x.city}` }))}
              empty="No overdue escalations."
            />
            <QueueList
              title="Recent updates"
              items={metrics.recentUpdates.map((u) => ({ title: u.title, action: 'Review', meta: `${u.source} • ${new Date(u.lastEdited).toLocaleString()}` }))}
              empty="No recent updates."
            />
          </div>
        </>
      );
    }

    if (currentRole === UserRole.SALES_OPS) {
      const topRiskRows = [
        ...opsStats.unassigned.map((r) => ({ title: r.name, action: 'Assign owner', meta: `Unassigned • ${r.city}` })),
        ...opsStats.stale.map((r) => ({ title: r.name, action: 'Update now', meta: `Stale ${daysSince(r.lastEdited)}d • ${r.rep}` })),
        ...opsStats.awaiting.map((r) => ({ title: r.name, action: 'Collect report', meta: `Awaiting report • ${r.rep}` })),
      ];

      return (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            <MetricCard label="Needs Scheduling" value={opsStats.needsScheduling.length} tone="warn" />
            <MetricCard label="In Progress" value={opsStats.inProgress.length} />
            <MetricCard label="Awaiting Reports" value={opsStats.awaiting.length} tone="warn" />
            <MetricCard label="Completed" value={opsStats.done.length} tone="good" />
            <MetricCard label="Top Risks" value={opsStats.unassigned.length + opsStats.stale.length} tone="danger" />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-semibold text-slate-900">Bottleneck board</h3>
            <p className="text-xs text-slate-500 mt-1">Stage pressure by workflow lane</p>
            <div className="mt-3 grid grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="text-xs text-amber-800">Needs Scheduling</div><div className="text-xl font-semibold text-amber-900">{opsStats.needsScheduling.length}</div></div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3"><div className="text-xs text-blue-800">In Progress</div><div className="text-xl font-semibold text-blue-900">{opsStats.inProgress.length}</div></div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3"><div className="text-xs text-rose-800">Awaiting Reports</div><div className="text-xl font-semibold text-rose-900">{opsStats.awaiting.length}</div></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-xs text-slate-700">Done</div><div className="text-xl font-semibold text-slate-900">{opsStats.done.length}</div></div>
            </div>
          </div>

          <QueueList title="Top-risk rows" subtitle="Unassigned + stale + awaiting reports" items={topRiskRows} empty="No major bottlenecks detected." />
        </>
      );
    }

    if (currentRole === UserRole.SALES_REP) {
      const myNeedsScheduling = myRows.filter((r) => isSchedulingStatus(r.vendorDayStatusNormalized));
      const myInProgress = myRows.filter((r) => isInProgressStatus(r.vendorDayStatusNormalized));
      const myAwaiting = myRows.filter((r) => isAwaitingStatus(r.vendorDayStatusNormalized));
      const myStale = myRows.filter((r) => daysSince(r.lastEdited) > 10);

      const nextBestActions = [
        ...myStale.map((r) => ({ title: r.name, action: 'Update account', meta: `No update for ${daysSince(r.lastEdited)} days • ${r.city}` })),
        ...myNeedsScheduling.map((r) => ({ title: r.name, action: 'Schedule vendor day', meta: r.city })),
        ...myAwaiting.map((r) => ({ title: r.name, action: 'Collect report', meta: r.city })),
        ...myInProgress.map((r) => ({ title: r.name, action: 'Progress check', meta: r.city })),
      ];

      return (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide">My Stores Identity</label>
              <select value={activeRep} onChange={(e) => setActiveRep(e.target.value)} className="mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[220px]">
                <option value="">Select rep...</option>
                {reps.map((rep) => (
                  <option key={rep} value={rep}>{rep}</option>
                ))}
              </select>
            </div>
            <div className="text-xs rounded-lg px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200">
              {activeRep ? `Focused on ${activeRep} — persistent across dashboard + CRM.` : 'Pick your name to lock My Stores behavior.'}
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <MetricCard label="My Stores" value={myRows.length} />
            <MetricCard label="Needs Scheduling" value={myNeedsScheduling.length} tone="warn" />
            <MetricCard label="In Progress" value={myInProgress.length} tone="default" />
            <MetricCard label="Awaiting Reports" value={myAwaiting.length} tone="warn" />
          </div>

          <QueueList
            title="Next Best Actions"
            subtitle="Prioritized by stale accounts, then scheduling, reports, and in-progress follow-ups"
            items={nextBestActions}
            empty={activeRep ? 'No immediate actions in your queue.' : 'Select a rep to load your queue.'}
          />
        </>
      );
    }

    if (currentRole === UserRole.FINANCE) {
      const sortedByAmount = finance.rows.slice().sort((a, b) => b.amount - a.amount);
      const pendingHighValue = sortedByAmount.filter((r) => isPendingStatus(r.status)).slice(0, 5);
      const largestItems = sortedByAmount.slice(0, 5);
      const pendingExposure = finance.rows.filter((r) => isPendingStatus(r.status)).reduce((sum, r) => sum + r.amount, 0);

      return (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            <MetricCard label="Revenue" value={`$${finance.totals.revenue.toLocaleString()}`} tone="good" />
            <MetricCard label="Expenses" value={`$${finance.totals.expenses.toLocaleString()}`} tone="warn" />
            <MetricCard label="Net" value={`$${finance.totals.net.toLocaleString()}`} tone={finance.totals.net >= 0 ? 'good' : 'danger'} />
            <MetricCard label="Pending Exposure" value={`$${pendingExposure.toLocaleString()}`} tone="warn" />
            <MetricCard label="Pending High-Value" value={pendingHighValue.length} tone="danger" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <QueueList
              title="Exception-first decision panel"
              subtitle="Pending high-value items"
              items={pendingHighValue.map((r) => ({ title: r.name, action: 'Decide', meta: `${r.category} • $${r.amount.toLocaleString()} • ${r.status}` }))}
              empty="No pending high-value items."
            />
            <QueueList
              title="Largest items"
              subtitle={`Net risk indicator: ${finance.totals.net >= 0 ? 'Positive' : 'Negative'} (${finance.totals.net >= 0 ? '+' : ''}$${finance.totals.net.toLocaleString()})`}
              items={largestItems.map((r) => ({ title: r.name, action: 'Review', meta: `${r.category} • $${r.amount.toLocaleString()} • ${r.status}` }))}
              empty="No finance records available yet."
            />
          </div>
        </>
      );
    }

    return (
      <>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          <MetricCard label="Connected DBs" value={Object.keys(metrics.dbMap).length} />
          <MetricCard label="CRM Stores" value={crmRows.length} />
          <MetricCard label="Open Work Orders" value={metrics.openWorkOrders} tone="warn" />
          <MetricCard label="Pending Submissions" value={metrics.pendingVendorSubmissions} tone="warn" />
          <MetricCard label="Critical Risks" value={opsStats.unassigned.length + opsStats.stale.length} tone="danger" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <QueueList
            title="System & data risks"
            items={[
              ...warningMessages.map((w) => ({ title: w, meta: 'Service warning' })),
              ...opsStats.unassigned.map((r) => ({ title: `${r.name} has no owner`, meta: 'CRM ownership gap' })),
              ...opsStats.stale.map((r) => ({ title: `${r.name} stale ${daysSince(r.lastEdited)}d`, meta: 'No recent updates' })),
            ]}
            empty="No major platform risks detected."
          />
          <QueueList
            title="Latest activity"
            items={metrics.recentUpdates.map((u) => ({ title: u.title, meta: `${u.source} • ${new Date(u.lastEdited).toLocaleString()}` }))}
            empty="No recent activity."
          />
        </div>
      </>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{roleHeader}</h1>
          <p className="text-slate-600 text-sm mt-1">{roleSubheader}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>{new Date().toLocaleString()}</div>
          <button onClick={refresh} className="text-sm text-indigo-600 hover:text-indigo-800 mt-1 inline-flex items-center gap-1">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />} Refresh
          </button>
        </div>
      </div>

      {warningMessages.length > 0 && (
        <div className="space-y-2">
          {warningMessages.map((msg, idx) => (
            <div key={`${msg}-${idx}`} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle size={16} /> {msg}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500 text-sm flex items-center gap-2">
          <Loader2 className="animate-spin" size={16} /> Building your role-specific view...
        </div>
      ) : crmRows.length === 0 ? (
        <div className="bg-white border border-rose-200 rounded-xl p-5 text-rose-700 text-sm flex items-start gap-2">
          <ShieldAlert size={16} className="mt-0.5" />
          CRM data did not load. Go to Settings and confirm PICC CRM mapping + auth session, then refresh.
        </div>
      ) : (
        <>
          {renderRoleView()}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">Referral / Sample Pipeline</h3>
                <p className="text-xs text-slate-500 mt-1">Cross-role queue derived from CRM keyword signals.</p>
              </div>
              <div className="text-xs text-slate-500">
                {currentRole === UserRole.SALES_REP && activeRep ? `Scoped to ${activeRep}` : 'Global CRM scope'}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3"><div className="text-xs text-indigo-700">Referral Tagged</div><div className="text-xl font-semibold text-indigo-900">{referralSample.referralCount}</div></div>
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3"><div className="text-xs text-cyan-700">Sample Tagged</div><div className="text-xl font-semibold text-cyan-900">{referralSample.sampleCount}</div></div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><div className="text-xs text-amber-700">Pending Queue</div><div className="text-xl font-semibold text-amber-900">{referralSample.pendingCount}</div></div>
            </div>
            <div className="mt-3 space-y-2">
              {referralSample.queue.length === 0 ? (
                <div className="text-sm text-slate-500">No active referral/sample rows detected in CRM properties.</div>
              ) : (
                referralSample.queue.map((item) => (
                  <div key={`${item.title}-${item.meta}`} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-slate-800">{item.title}</div>
                      <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                        item.stage === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.tags} • {item.stage}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{item.meta}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="text-xs text-slate-500 inline-flex items-center gap-1">
        <Users size={12} /> Role mode: {currentRole}
      </div>
    </div>
  );
};
