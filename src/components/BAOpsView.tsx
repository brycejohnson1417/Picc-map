import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ClipboardCopy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { loadBAOpsData, type BAOpsData, type BAOpsItem } from '../services/baOpsService';

interface QueuePanelProps {
  title: string;
  subtitle: string;
  items: BAOpsItem[];
  emptyHint: string;
  actionLabel: string;
  actionTemplate: (item: BAOpsItem) => string;
}

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const copyText = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore clipboard failures on restricted browsers
  }
};

const QueuePanel: React.FC<QueuePanelProps> = ({ title, subtitle, items, emptyHint, actionLabel, actionTemplate }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full border border-slate-300 bg-white text-slate-700">{items.length}</span>
      </div>

      <div className="p-3 space-y-3 max-h-[360px] overflow-auto">
        {items.length === 0 ? (
          <div className="text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg p-3 text-center">{emptyHint}</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm text-slate-900">{item.storeName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.city}{item.region !== '—' ? ` · ${item.region}` : ''} • {item.rep}</div>
                </div>
                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {item.vendorDayStatus}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>Event: <span className="text-slate-800">{formatDate(item.eventDate)}</span></div>
                <div>Report due: <span className="text-slate-800">{formatDate(item.reportDueDate)}</span></div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void copyText(actionTemplate(item))}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  <ClipboardCopy size={12} /> {actionLabel}
                </button>
                {item.notionUrl && (
                  <a
                    href={item.notionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Open Notion <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const BAOpsView: React.FC = () => {
  const [data, setData] = useState<BAOpsData>({
    needsScheduling: [],
    inProgress: [],
    awaitingReports: [],
    overdueFollowUps: [],
    lastRefreshed: new Date().toISOString(),
    source: 'fallback',
  });
  const [loading, setLoading] = useState(true);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    const next = await loadBAOpsData();
    setData(next);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const totals = useMemo(
    () => ({
      needsScheduling: data.needsScheduling.length,
      inProgress: data.inProgress.length,
      awaitingReports: data.awaitingReports.length,
      overdueFollowUps: data.overdueFollowUps.length,
    }),
    [data],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">BA Ops Command</h2>
          <p className="text-sm text-slate-600">Live operations queues sourced from CRM + Vendor Day submissions.</p>
        </div>
        <button
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {data.warning && !loading && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle size={16} /> {data.warning}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3"><div className="text-xs text-slate-500">Needs scheduling</div><div className="text-2xl font-semibold text-amber-700">{totals.needsScheduling}</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3"><div className="text-xs text-slate-500">In-progress vendor days</div><div className="text-2xl font-semibold text-blue-700">{totals.inProgress}</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3"><div className="text-xs text-slate-500">Awaiting reports</div><div className="text-2xl font-semibold text-violet-700">{totals.awaitingReports}</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3"><div className="text-xs text-slate-500">Overdue follow-ups</div><div className="text-2xl font-semibold text-rose-700">{totals.overdueFollowUps}</div></div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-900">
        <div className="font-semibold mb-1">Quick SOP hints</div>
        <ul className="list-disc ml-4 space-y-1 text-indigo-800">
          <li>Scheduling queue: lock date/time, confirm BA owner, and post confirmation in Notion same day.</li>
          <li>In-progress: verify on-site check-in before noon and product inventory by 2 PM local.</li>
          <li>Awaiting reports: request recap + photos within 24h of event close.</li>
          <li>Overdue follow-ups: escalate to sales lead after 48h overdue and tag in the record thread.</li>
        </ul>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500 text-sm flex items-center gap-2">
          <Loader2 className="animate-spin" size={16} /> Loading BA operations queues...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <QueuePanel
            title="Needs Scheduling Queue"
            subtitle="Stores pending date assignment"
            items={data.needsScheduling}
            emptyHint="No unscheduled stores in queue."
            actionLabel="Copy scheduling ping"
            actionTemplate={(item) => `Hi ${item.rep}, please lock a vendor day date for ${item.storeName} and update status in Notion by EOD.`}
          />
          <QueuePanel
            title="In-Progress Vendor Days"
            subtitle="Currently active or scheduled this week"
            items={data.inProgress}
            emptyHint="No active vendor days found."
            actionLabel="Copy check-in reminder"
            actionTemplate={(item) => `Reminder: ${item.storeName} vendor day is in progress. Please post check-in + mid-shift update in Notion.`}
          />
          <QueuePanel
            title="Awaiting Reports"
            subtitle="Events needing recap submission"
            items={data.awaitingReports}
            emptyHint="No pending reports right now."
            actionLabel="Copy report request"
            actionTemplate={(item) => `Please submit your vendor day recap for ${item.storeName} (sales notes + photos) before end of day.`}
          />
          <QueuePanel
            title="Overdue Report Follow-Ups"
            subtitle="Missed due date or >3 days after event"
            items={data.overdueFollowUps}
            emptyHint="No overdue report follow-ups."
            actionLabel="Copy escalation note"
            actionTemplate={(item) => `Escalation: ${item.storeName} report is overdue. Need final recap + proof of execution immediately.`}
          />
        </div>
      )}

      <div className="text-xs text-slate-500">Last refreshed: {new Date(data.lastRefreshed).toLocaleString()}</div>
    </div>
  );
};
