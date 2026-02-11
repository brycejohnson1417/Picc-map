import React, { useState } from 'react';
import { ClipboardList, Package, X, ChevronDown } from 'lucide-react';
import type { ProposalLineItem, ProposalCustomer } from '../types';

interface ProposalSummaryProps {
  lineItems: ProposalLineItem[];
  totalCost: number;
  totalItems: number;
  customers: ProposalCustomer[];
  selectedCustomerId: string | null;
  onCustomerChange: (customerId: string | null) => void;
  onShowCustomerModal: () => void;
  proposalTitle: string;
  onTitleChange: (title: string) => void;
  proposalNotes: string;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  onExport: (format: 'pdf' | 'excel' | 'csv' | 'clipboard' | 'clipboard-qty') => void;
  onClear: () => void;
  onRemoveItem: (productId: string) => void;
}

export const ProposalSummary: React.FC<ProposalSummaryProps> = ({
  lineItems,
  totalCost,
  totalItems,
  customers,
  selectedCustomerId,
  onCustomerChange,
  onShowCustomerModal,
  proposalTitle,
  onTitleChange,
  proposalNotes,
  onNotesChange,
  onSave,
  onExport,
  onClear,
  onRemoveItem,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleRemoveItem = (productId: string) => {
    onRemoveItem(productId);
  };

  const canSave = lineItems.length > 0 && selectedCustomerId && proposalTitle.trim().length > 0;

  const summaryContent = (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Proposal Summary
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Customer
          </label>
          <div className="flex gap-2">
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => onCustomerChange(e.target.value || null)}
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Customer --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.dba_name ? ` (${customer.dba_name})` : ''}
                  {customer.location ? ` - ${customer.location}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={onShowCustomerModal}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              title="Add New Customer"
            >
              +
            </button>
          </div>
        </div>

        {/* Proposal Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Proposal Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={proposalTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g., February Restock"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={proposalNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Additional notes..."
            rows={3}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-700 -mx-6 my-4"></div>

        {/* Line Items */}
        {lineItems.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              Start building your proposal
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select products from the grid and set quantities
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lineItems.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-start justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                      {item.brand}
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {item.strain_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Qty: {item.quantity} x {formatCurrency(item.unit_price)} ={' '}
                      {formatCurrency(item.line_total)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.product_id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove item"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Summary Totals */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>
                  {lineItems.length} product{lineItems.length !== 1 ? 's' : ''}, {totalItems} unit
                  {totalItems !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Total
                </span>
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onSave}
            disabled={!canSave}
            className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
              canSave
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed'
            }`}
          >
            Save Proposal
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={lineItems.length === 0}
              className={`w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                lineItems.length > 0
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed'
              }`}
            >
              Export
              <ChevronDown className="w-4 h-4" />
            </button>

            {showExportMenu && lineItems.length > 0 && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                {/* Menu */}
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-20">
                  <button
                    onClick={() => {
                      onExport('pdf');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Export as PDF
                  </button>
                  <button
                    onClick={() => {
                      onExport('excel');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Export as Excel
                  </button>
                  <button
                    onClick={() => {
                      onExport('csv');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Export as CSV
                  </button>
                  <div className="border-t border-slate-200 dark:border-slate-700"></div>
                  <button
                    onClick={() => {
                      onExport('clipboard');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => {
                      onExport('clipboard-qty');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Copy with Quantities
                  </button>
                </div>
              </>
            )}
          </div>

          {lineItems.length > 0 && (
            <button
              onClick={onClear}
              className="w-full py-2 rounded-lg font-medium text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Mobile floating button and expandable view
  return (
    <>
      {/* Desktop - sticky sidebar */}
      <div className="hidden lg:block w-full lg:w-80 xl:w-96 lg:sticky lg:top-4 lg:self-start">
        {summaryContent}
      </div>

      {/* Mobile - collapsible bottom section */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {isExpanded && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10"
              onClick={() => setIsExpanded(false)}
            />
            {/* Expanded content */}
            <div className="bg-white dark:bg-slate-800 rounded-t-2xl border-t border-slate-200 dark:border-slate-700 shadow-xl max-h-[85vh] overflow-y-auto">
              {summaryContent}
            </div>
          </>
        )}

        {/* Floating review button */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-6 font-medium shadow-lg flex items-center justify-between"
          >
            <span>
              Review Proposal
              {lineItems.length > 0 && ` (${lineItems.length} item${lineItems.length !== 1 ? 's' : ''})`}
            </span>
            <ChevronDown className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>
    </>
  );
};