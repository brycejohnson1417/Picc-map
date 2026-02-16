import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { loadCRMRecords, type CRMRecord } from '../services/crmService';

type ViewKey = 'all' | 'needsScheduling' | 'inProgress' | 'awaitingReports' | 'done';

interface MultiFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

const savedViews: Array<{ key: ViewKey; label: string }> = [
  { key: 'all', label: 'All Stores' },
  { key: 'needsScheduling', label: 'Needs Scheduling' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'awaitingReports', label: 'Awaiting Reports' },
  { key: 'done', label: 'Done' },
];

const includesAny = (value: string, needles: string[]) => needles.some((needle) => value.includes(needle));

const isNeedsScheduling = (row: CRMRecord): boolean =>
  includesAny(row.vendorDayStatusNormalized, ['not_started', 'asap', 'to_schedule', 'unscheduled']);

const isAwaitingReports = (row: CRMRecord): boolean => includesAny(row.vendorDayStatusNormalized, ['awaiting_reports', 'report_pending']);

const isInProgress = (row: CRMRecord): boolean => includesAny(row.vendorDayStatusNormalized, ['in_progress', 'scheduled', 'active', 'ongoing']);

const isDone = (row: CRMRecord): boolean => includesAny(row.vendorDayStatusNormalized, ['done', 'completed', 'closed']);

const MultiFilter: React.FC<MultiFilterProps> = ({ label, options, selected, onToggle }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-700 hover:bg-slate-50"
      >
        <span>{label}</span>
        {selected.length > 0 && <span className="text-xs text-indigo-600 font-semibold">{selected.length}</span>}
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-64 bg-white border border-slate-200 shadow-lg rounded-lg p-2 max-h-64 overflow-auto">
          {options.length === 0 ? (
            <div className="text-xs text-slate-500 p-2">No options</div>
          ) : (
            options.map((option) => {
              const active = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onToggle(option)}
                  className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-slate-100 flex items-center justify-between"
                >
                  <span className="truncate">{option}</span>
                  {active && <Check size={14} className="text-indigo-600" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const SalesCRM: React.FC = () => {
  const [rows, setRows] = useState<CRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CRMRecord | null>(null);
  const [selectedView, setSelectedView] = useState<ViewKey>('all');
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toISOString());

  const [repFilter, setRepFilter] = useState<string[]>([]);
  const [accountStatusFilter, setAccountStatusFilter] = useState<string[]>([]);
  const [vendorStatusFilter, setVendorStatusFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);

  const [myStoresOnly, setMyStoresOnly] = useState(false);
  const [needsSchedulingOnly, setNeedsSchedulingOnly] = useState(false);
  const [awaitingReportsOnly, setAwaitingReportsOnly] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const data = await loadCRMRecords();
    setRows(data);
    setSelected((prev) => (prev ? data.find((d) => d.id === prev.id) || null : null));
    setLastRefreshed(new Date().toISOString());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const accountStatuses = useMemo(() => Array.from(new Set(rows.map((r) => r.accountStatus))).sort(), [rows]);
  const vendorStatuses = useMemo(() => Array.from(new Set(rows.map((r) => r.vendorDayStatus))).sort(), [rows]);
  const reps = useMemo(() => Array.from(new Set(rows.map((r) => r.rep))).sort(), [rows]);
  const locations = useMemo(
    () => Array.from(new Set(rows.map((r) => (r.region !== '—' ? `${r.city} · ${r.region}` : r.city)))).sort(),
    [rows],
  );

  const selectedRep = repFilter[0] ?? '';

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((r) => {
      const locationValue = r.region !== '—' ? `${r.city} · ${r.region}` : r.city;

      const matchesSearch =
        !query ||
        r.name.toLowerCase().includes(query) ||
        r.city.toLowerCase().includes(query) ||
        r.region.toLowerCase().includes(query) ||
        r.rep.toLowerCase().includes(query) ||
        r.accountStatus.toLowerCase().includes(query) ||
        r.vendorDayStatus.toLowerCase().includes(query);

      const matchesAccountStatus = accountStatusFilter.length === 0 || accountStatusFilter.includes(r.accountStatus);
      const matchesVendorStatus = vendorStatusFilter.length === 0 || vendorStatusFilter.includes(r.vendorDayStatus);
      const matchesRep = repFilter.length === 0 || repFilter.includes(r.rep);
      const matchesLocation = locationFilter.length === 0 || locationFilter.includes(locationValue);

      const matchesView =
        selectedView === 'all' ||
        (selectedView === 'needsScheduling' && isNeedsScheduling(r)) ||
        (selectedView === 'inProgress' && isInProgress(r)) ||
        (selectedView === 'awaitingReports' && isAwaitingReports(r)) ||
        (selectedView === 'done' && isDone(r));

      const matchesMyStores = !myStoresOnly || (selectedRep ? r.rep === selectedRep : true);
      const matchesNeedsScheduling = !needsSchedulingOnly || isNeedsScheduling(r);
      const matchesAwaitingReports = !awaitingReportsOnly || isAwaitingReports(r);

      return (
        matchesSearch &&
        matchesAccountStatus &&
        matchesVendorStatus &&
        matchesRep &&
        matchesLocation &&
        matchesView &&
        matchesMyStores &&
        matchesNeedsScheduling &&
        matchesAwaitingReports
      );
    });
  }, [
    rows,
    search,
    accountStatusFilter,
    vendorStatusFilter,
    repFilter,
    locationFilter,
    selectedView,
    myStoresOnly,
    selectedRep,
    needsSchedulingOnly,
    awaitingReportsOnly,
  ]);

  const toggleFilter = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const contactSummary = useMemo(() => {
    if (!selected) return '';
    const fields = selected.properties.filter((p) => {
      const key = p.name.toLowerCase();
      return key.includes('contact') || key.includes('email') || key.includes('phone');
    });

    if (fields.length === 0) return 'No contact data available';
    return fields.map((f) => `${f.name}: ${f.value}`).join('\n');
  }, [selected]);

  const copyContactSummary = async () => {
    if (!contactSummary) return;
    await navigator.clipboard.writeText(contactSummary);
  };

  const grouped = useMemo(() => {
    if (!selected) return null;

    const byKeys = (needles: string[]) =>
      selected.properties.filter((prop) => needles.some((needle) => prop.name.toLowerCase().includes(needle)));

    return {
      profile: byKeys(['name', 'location', 'city', 'region', 'status', 'rep', 'ambassador']),
      contacts: byKeys(['contact', 'email', 'phone', 'mobile']),
      vendorDay: byKeys(['vendor', 'event', 'report', 'submission', 'date']),
      commercial: byKeys(['credit', 'order', 'terms', 'payment', 'commercial']),
    };
  }, [selected]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Sales CRM</h2>
          <p className="text-sm text-slate-600">Dispensary Master List CRM • {filtered.length} shown / {rows.length} total</p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {savedViews.map((view) => (
            <button
              key={view.key}
              onClick={() => setSelectedView(view.key)}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                selectedView === view.key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dispensary, status, rep, city..."
            className="min-w-[260px] flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <MultiFilter
            label="Account Status"
            options={accountStatuses}
            selected={accountStatusFilter}
            onToggle={(value) => toggleFilter(value, accountStatusFilter, setAccountStatusFilter)}
          />
          <MultiFilter
            label="Vendor Day Status"
            options={vendorStatuses}
            selected={vendorStatusFilter}
            onToggle={(value) => toggleFilter(value, vendorStatusFilter, setVendorStatusFilter)}
          />
          <MultiFilter label="Rep" options={reps} selected={repFilter} onToggle={(value) => toggleFilter(value, repFilter, setRepFilter)} />
          <MultiFilter
            label="Region/City"
            options={locations}
            selected={locationFilter}
            onToggle={(value) => toggleFilter(value, locationFilter, setLocationFilter)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMyStoresOnly((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs border ${
              myStoresOnly ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            My Stores
          </button>
          <button
            onClick={() => setNeedsSchedulingOnly((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs border ${
              needsSchedulingOnly ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            Needs Scheduling
          </button>
          <button
            onClick={() => setAwaitingReportsOnly((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs border ${
              awaitingReportsOnly ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            Awaiting Reports
          </button>
          <div className="ml-auto text-xs text-slate-500">Last refreshed: {new Date(lastRefreshed).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 text-slate-500 text-sm flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Loading CRM records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-slate-500 text-sm">No records found with current filters.</div>
          ) : (
            <div className="overflow-auto max-h-[72vh]">
              <table className="min-w-[1100px] w-full text-[13px] leading-5">
                <thead className="text-slate-600">
                  <tr>
                    <th className="sticky top-0 left-0 z-30 bg-slate-100 text-left px-3 py-2 font-semibold border-b border-slate-200">Name</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-3 py-2 font-semibold border-b border-slate-200">Account Status</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-3 py-2 font-semibold border-b border-slate-200">Vendor Day Status</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-3 py-2 font-semibold border-b border-slate-200">City/Region</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-3 py-2 font-semibold border-b border-slate-200">Assigned Rep</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-3 py-2 font-semibold border-b border-slate-200">Last Vendor Day Date</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-3 py-2 font-semibold border-b border-slate-200">Last Edited</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const active = selected?.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className={`cursor-pointer border-b border-slate-100 ${active ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                      >
                        <td className={`sticky left-0 z-10 px-3 py-2 font-medium ${active ? 'bg-indigo-50/70' : 'bg-white group-hover:bg-slate-50'}`}>
                          <div className="truncate max-w-[260px]">{r.name}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{r.accountStatus}</td>
                        <td className="px-3 py-2 text-slate-700">{r.vendorDayStatus}</td>
                        <td className="px-3 py-2 text-slate-700">{r.city}{r.region !== '—' ? ` · ${r.region}` : ''}</td>
                        <td className="px-3 py-2 text-slate-700">{r.rep}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {r.lastVendorDayDate ? new Date(r.lastVendorDayDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{r.lastEdited ? new Date(r.lastEdited).toLocaleDateString() : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 h-fit xl:sticky xl:top-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Dispensary Detail</h3>
              <p className="text-xs text-slate-500">Select a row to inspect fields and contacts.</p>
            </div>
            <div className="flex gap-2">
              {selected?.notionUrl && (
                <a
                  href={selected.notionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Open in Notion <ExternalLink size={12} />
                </a>
              )}
              {selected && (
                <button
                  onClick={copyContactSummary}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  <Copy size={12} /> Copy contact summary
                </button>
              )}
            </div>
          </div>

          {!selected || !grouped ? (
            <div className="text-sm text-slate-500">No dispensary selected.</div>
          ) : (
            <div className="space-y-3 text-sm">
              <section>
                <h4 className="font-semibold text-slate-800 mb-1">Profile</h4>
                <div className="space-y-1">{grouped.profile.length ? grouped.profile.map((f) => <div key={f.name}><span className="text-slate-500">{f.name}: </span><span className="text-slate-800">{f.value}</span></div>) : <div className="text-slate-500">No profile fields</div>}</div>
              </section>
              <section>
                <h4 className="font-semibold text-slate-800 mb-1">Contacts</h4>
                <div className="space-y-1">{grouped.contacts.length ? grouped.contacts.map((f) => <div key={f.name}><span className="text-slate-500">{f.name}: </span><span className="text-slate-800">{f.value}</span></div>) : <div className="text-slate-500">No contacts found</div>}</div>
              </section>
              <section>
                <h4 className="font-semibold text-slate-800 mb-1">Vendor Day</h4>
                <div className="space-y-1">{grouped.vendorDay.length ? grouped.vendorDay.map((f) => <div key={f.name}><span className="text-slate-500">{f.name}: </span><span className="text-slate-800">{f.value}</span></div>) : <div className="text-slate-500">No vendor day fields</div>}</div>
              </section>
              <section>
                <h4 className="font-semibold text-slate-800 mb-1">Commercial</h4>
                <div className="space-y-1">{grouped.commercial.length ? grouped.commercial.map((f) => <div key={f.name}><span className="text-slate-500">{f.name}: </span><span className="text-slate-800">{f.value}</span></div>) : <div className="text-slate-500">No commercial fields</div>}</div>
              </section>

              <details className="border-t border-slate-200 pt-2">
                <summary className="cursor-pointer font-semibold text-slate-800">All Fields ({selected.properties.length})</summary>
                <div className="mt-2 max-h-64 overflow-auto border border-slate-200 rounded-md">
                  {selected.properties.map((prop) => (
                    <div key={prop.name} className="px-2 py-1.5 border-b border-slate-100 last:border-b-0">
                      <div className="text-xs uppercase tracking-wide text-slate-500">{prop.name}</div>
                      <div className="text-slate-800 break-words">{prop.value || '—'}</div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
