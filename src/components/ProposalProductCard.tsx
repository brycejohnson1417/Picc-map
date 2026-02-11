import React from 'react';
import type { Product } from '../types';

interface ProposalProductCardProps {
  product: Product;
  quantity: number;
  onQuantityChange: (productId: string, quantity: number) => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
};

export const ProposalProductCard: React.FC<ProposalProductCardProps> = ({
  product,
  quantity,
  onQuantityChange,
}) => {
  const hasQuantity = quantity > 0;
  const lineTotal = product.unit_price * quantity;
  const isOutOfStock = product.available_quantity === 0;

  const getStrainTypePillStyles = () => {
    switch (product.strain_type) {
      case 'S':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'H':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'I':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getStrainTypeLabel = () => {
    if (product.strain_type) return product.strain_type;
    return 'ACC';
  };

  const getQuickQuantities = (cs: number): number[] => {
    if (!cs || cs <= 1) return [1, 5, 10, 25, 50];
    if (cs <= 10) return [1, cs, cs*2, cs*4, cs*8];
    if (cs <= 20) return [1, cs, cs*2, cs*4, cs*6];
    return [1, cs, cs*2, cs*3, cs*4];
  };
  const quickQuantities = getQuickQuantities(product.case_size ?? 10);

  const handleQuickQty = (qty: number) => {
    const newQuantity = Math.min(qty, product.available_quantity);
    onQuantityChange(product.id, newQuantity);
  };

  const handleCustomQty = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
      onQuantityChange(product.id, 0);
      return;
    }
    const newQuantity = Math.min(Math.max(0, value), product.available_quantity);
    onQuantityChange(product.id, newQuantity);
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 transition-all ${
        hasQuantity ? 'ring-2 ring-indigo-500' : ''
      }`}
    >
      {/* Top row: Brand + Strain Type */}
      <div className="flex items-center justify-between mb-2">
        <span className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full">
          {product.brand}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStrainTypePillStyles()}`}
        >
          {getStrainTypeLabel()}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">
        {product.strain_name || product.product_title}
      </h3>

      {/* Product Type */}
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
        {product.product_type}
      </p>

      {/* Size + Price Row */}
      <div className="flex items-center justify-between mb-2">
        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium px-2 py-1 rounded">
          {product.size}
        </span>
        <span className="text-amber-600 dark:text-amber-400 font-semibold">
          {formatCurrency(product.unit_price)}
        </span>
      </div>

      {/* Available Quantity */}
      <p
        className={`text-xs mb-4 ${
          isOutOfStock
            ? 'text-red-600 dark:text-red-400 font-semibold'
            : 'text-slate-400'
        }`}
      >
        {isOutOfStock ? 'Out of stock' : `${product.available_quantity} available`}
      </p>

      {/* Quick Quantity Buttons */}
      {!isOutOfStock && (
        <>
          <div className="flex gap-2 mb-3">
            {quickQuantities.map((qty) => (
              <button
                key={qty}
                onClick={() => handleQuickQty(qty)}
                disabled={qty > product.available_quantity}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  qty > product.available_quantity
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                }`}
              >
                {qty}
              </button>
            ))}
          </div>

          {/* Custom Quantity Input */}
          <div className="mb-3">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Custom quantity
            </label>
            <input
              type="number"
              min="0"
              max={product.available_quantity}
              value={quantity}
              onChange={handleCustomQty}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </>
      )}

      {/* Line Total */}
      {hasQuantity && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Line Total
            </span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(lineTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};