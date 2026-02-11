import { Product } from '../types';
import { MOCK_PRODUCTS } from '../constants';

export type InventoryStatus = 'live' | 'cached' | 'mock';

export interface InventoryResult {
  products: Product[];
  status: InventoryStatus;
}

export const fetchInventory = async (): Promise<InventoryResult> => {
  try {
    // Try to fetch live inventory from /api/inventory
    const response = await fetch('/api/inventory', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.products && Array.isArray(data.products)) {
        return {
          products: data.products,
          status: 'live'
        };
      }
    }
  } catch (error) {
    console.error('Inventory fetch error:', error);
  }

  // Return mock data as fallback
  return {
    products: MOCK_PRODUCTS,
    status: 'mock'
  };
};
