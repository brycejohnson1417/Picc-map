import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';

interface ProposalFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStrainType: string | null;
  onStrainTypeChange: (type: string | null) => void;
  selectedBrands: string[];
  onBrandsChange: (brands: string[]) => void;
  selectedSize: string | null;
  onSizeChange: (size: string | null) => void;
  availableBrands: string[];
  availableSizes: string[];
  activeFilterCount: number;
  onClearFilters: () => void;
}

export const ProposalFilterBar: React.FC<ProposalFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedStrainType,
  onStrainTypeChange,
  selectedBrands,
  onBrandsChange,
  selectedSize,
  onSizeChange,
  availableBrands,
  availableSizes,
  activeFilterCount,
  onClearFilters,
}) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const sizeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        brandDropdownRef.current &&
        !brandDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBrandDropdown(false);
      }
      if (
        sizeDropdownRef.current &&
        !sizeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSizeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const strainTypes = [
    { value: null, label: 'All', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
    { value: 'S', label: 'Sativa', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    { value: 'H', label: 'Hybrid', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'I', label: 'Indica', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    { value: 'ACC', label: 'Accessories', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  ];

  const handleBrandToggle = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      onBrandsChange(selectedBrands.filter(b => b !== brand));
    } else {
      onBrandsChange([...selectedBrands, brand]);
    }
  };

  const FilterContent = () => (
    <>
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
        />
      </div>

      {/* Strain Type Pills */}
      <div className="flex flex-wrap gap-2">
        {strainTypes.map((type) => (
          <button
            key={type.value ?? 'all'}
            onClick={() => onStrainTypeChange(type.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedStrainType === type.value
                ? `${type.color} ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900`
                : `${type.color} opacity-60 hover:opacity-100`
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Brand Dropdown */}
      <div className="relative" ref={brandDropdownRef}>
        <button
          onClick={() => setShowBrandDropdown(!showBrandDropdown)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-900 dark:text-white"
        >
          <span className="text-sm">
            Brands {selectedBrands.length > 0 && `(${selectedBrands.length})`}
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showBrandDropdown && (
          <div className="absolute top-full mt-2 left-0 w-64 max-h-80 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20">
            <div className="p-2 space-y-1">
              {availableBrands.map((brand) => (
                <label
                  key={brand}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => handleBrandToggle(brand)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-900 dark:text-white">{brand}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Size Dropdown */}
      <div className="relative" ref={sizeDropdownRef}>
        <button
          onClick={() => setShowSizeDropdown(!showSizeDropdown)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-900 dark:text-white"
        >
          <span className="text-sm">
            {selectedSize || 'All Sizes'}
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showSizeDropdown && (
          <div className="absolute top-full mt-2 left-0 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20">
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  onSizeChange(null);
                  setShowSizeDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedSize === null
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                }`}
              >
                All Sizes
              </button>
              {availableSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    onSizeChange(size);
                    setShowSizeDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedSize === size
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
          <span className="text-sm">Clear ({activeFilterCount})</span>
        </button>
      )}
    </>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Desktop: Horizontal layout */}
      <div className="hidden md:flex items-center gap-4 p-4 flex-wrap">
        <FilterContent />
      </div>

      {/* Mobile: Collapsible */}
      <div className="md:hidden">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full flex items-center justify-between p-4 text-slate-900 dark:text-white"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {showMobileFilters && (
          <div className="px-4 pb-4 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
            <FilterContent />
          </div>
        )}
      </div>
    </div>
  );
};