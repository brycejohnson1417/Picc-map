import React from 'react';
import { Package } from 'lucide-react';
import { ProposalProductCard } from './ProposalProductCard';
import type { Product } from '../types';

interface ProposalProductGridProps {
  products: Product[];
  quantities: Record<string, number>;
  onQuantityChange: (productId: string, quantity: number) => void;
}

export const ProposalProductGrid: React.FC<ProposalProductGridProps> = ({
  products,
  quantities,
  onQuantityChange,
}) => {
  const preRollProducts = products.filter(
    (p) => p.inventory_class === 'PRE_ROLL'
  );
  const accessoryProducts = products.filter(
    (p) => p.inventory_class === 'ACCESSORIES'
  );

  const totalProducts = products.length;
  const hasProducts = totalProducts > 0;

  if (!hasProducts) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Package className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No products match your filters
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Result Count */}
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Showing <span className="font-semibold">{totalProducts}</span> product
        {totalProducts !== 1 ? 's' : ''}
      </div>

      {/* Pre-Rolls Section */}
      {preRollProducts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Pre-Rolls ({preRollProducts.length})
            </h2>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preRollProducts.map((product) => (
              <ProposalProductCard
                key={product.id}
                product={product}
                quantity={quantities[product.id] || 0}
                onQuantityChange={onQuantityChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Accessories Section */}
      {accessoryProducts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Accessories ({accessoryProducts.length})
            </h2>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accessoryProducts.map((product) => (
              <ProposalProductCard
                key={product.id}
                product={product}
                quantity={quantities[product.id] || 0}
                onQuantityChange={onQuantityChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};