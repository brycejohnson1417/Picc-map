import React, { useState } from 'react';
import { History, FileText, Copy, Download, ChevronDown, ChevronUp, Trash2, Check } from 'lucide-react';
import { SavedProposal } from '../types';

interface ProposalHistoryProps {
  proposals: SavedProposal[];
  onDuplicate: (proposal: SavedProposal) => void;
  onDelete: (proposalId: string) => void;
  onExport: (proposal: SavedProposal, format: 'pdf' | 'excel' | 'csv') => void;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const CopyProductTitleButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
      title="Copy full product title for Nabis"
    >
      {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
    </button>
  );
};

export const ProposalHistory: React.FC<ProposalHistoryProps> = ({
  proposals,
  onDuplicate,
  onDelete,
  onExport,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...proposals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[40vh] text-center p-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
          <History size={28} className="text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">No Proposals Yet</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          Create your first proposal in the Create tab to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{sorted.length} saved proposal{sorted.length !== 1 ? 's' : ''}</p>
      </div>

      {sorted.map((proposal) => {
        const isExpanded = expandedId === proposal.id;
        return (
          <div
            key={proposal.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{proposal.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      proposal.status === 'submitted'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {proposal.customer.name}{proposal.customer.location ? ` - ${proposal.customer.location}` : ''}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>{formatDate(proposal.created_at)}</span>
                    <span>{proposal.items.length} product{proposal.items.length !== 1 ? 's' : ''}</span>
                    <span>{proposal.total_items} units</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(proposal.total_cost)}</span>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-200 dark:border-slate-700">
                {proposal.notes && (
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-400 italic">
                    {proposal.notes}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <th className="text-left px-4 py-2 font-medium text-slate-500 dark:text-slate-400">Brand</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-500 dark:text-slate-400">Strain</th>
                        <th className="text-center px-4 py-2 font-medium text-slate-500 dark:text-slate-400">Type</th>
                        <th className="text-center px-4 py-2 font-medium text-slate-500 dark:text-slate-400">Size</th>
                        <th className="text-center px-4 py-2 font-medium text-slate-500 dark:text-slate-400">Qty</th>
                        <th className="text-right px-4 py-2 font-medium text-slate-500 dark:text-slate-400">Price</th>
                        <th className="text-right px-4 py-2 font-medium text-slate-500 dark:text-slate-400">Total</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{item.brand}</td>
                          <td className="px-4 py-2 text-slate-900 dark:text-white">{item.strain_name}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              item.strain_type === 'S' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              item.strain_type === 'H' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              item.strain_type === 'I' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {item.strain_type || 'ACC'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center text-slate-500 dark:text-slate-400">{item.size}</td>
                          <td className="px-4 py-2 text-center font-medium text-slate-900 dark:text-white">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(item.line_total)}</td>
                          <td className="px-4 py-2 text-center">
                            <CopyProductTitleButton text={item.product_title} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-900/50">
                        <td colSpan={5}></td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">Total:</td>
                        <td className="px-4 py-2 text-right font-bold text-amber-600 dark:text-amber-400">{formatCurrency(proposal.total_cost)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="px-4 py-3 flex flex-wrap gap-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={(e) => { e.stopPropagation(); onExport(proposal, 'pdf'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    PDF
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onExport(proposal, 'excel'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <FileText size={14} />
                    Excel
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onExport(proposal, 'csv'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    <FileText size={14} />
                    CSV
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(proposal); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(proposal.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-auto"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
