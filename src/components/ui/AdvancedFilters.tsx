import React, { useState, useRef } from 'react';
import { X, Filter, Calendar, MapPin, User, Tag, CheckSquare } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

export interface FilterOptions {
  dateRange: { start: string; end: string };
  statuses: string[];
  categories: string[];
  priorities: string[];
  reporters: string[];
  locations: string[];
  searchTerm: string;
}

export interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onApply: () => void;
  onReset: () => void;
  availableStatuses?: string[];
  availableCategories?: string[];
  availablePriorities?: string[];
  className?: string;
}

const STATUS_OPTIONS = ['pending', 'in_progress', 'resolved', 'declined', 'awaiting_verification'];
const CATEGORY_OPTIONS = ['infrastructure', 'safety', 'environmental', 'public services', 'other'];
const PRIORITY_OPTIONS = ['high', 'medium', 'low'];

export function AdvancedFilters({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  onReset,
  availableStatuses = STATUS_OPTIONS,
  availableCategories = CATEGORY_OPTIONS,
  availablePriorities = PRIORITY_OPTIONS,
  className
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'statuses' | 'categories' | 'priorities', value: string) => {
    setLocalFilters(prev => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      dateRange: { start: '', end: '' },
      statuses: [],
      categories: [],
      priorities: [],
      reporters: [],
      locations: [],
      searchTerm: ''
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onReset();
  };

  const activeFilterCount = [
    localFilters.dateRange.start || localFilters.dateRange.end,
    localFilters.statuses.length,
    localFilters.categories.length,
    localFilters.priorities.length,
    localFilters.searchTerm
  ].filter(Boolean).length;

  const containerRef = useKeyboardNavigation(isOpen, onClose, {
    closeOnEscape: true,
    trapFocus: true
  });

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className={cn('fixed inset-0 z-[1000]', className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="advanced-filters-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Filter Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <h2 id="advanced-filters-title" className="text-lg font-semibold text-gray-900">Advanced Filters</h2>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close filters"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Search Term */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Search Term
            </label>
            <input
              type="text"
              value={localFilters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Search in title, description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={localFilters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { ...localFilters.dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={localFilters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { ...localFilters.dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Status Filters */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Status
            </label>
            <div className="space-y-2">
              {availableStatuses.map(status => (
                <label
                  key={status}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.statuses.includes(status)}
                    onChange={() => toggleArrayItem('statuses', status)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {status.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Category Filters */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Category
            </label>
            <div className="space-y-2">
              {availableCategories.map(category => (
                <label
                  key={category}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.categories.includes(category)}
                    onChange={() => toggleArrayItem('categories', category)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {category}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filters */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Priority
            </label>
            <div className="space-y-2">
              {availablePriorities.map(priority => (
                <label
                  key={priority}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.priorities.includes(priority)}
                    onChange={() => toggleArrayItem('priorities', priority)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {priority}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 space-y-2">
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleApply}
              fullWidth
              className="flex-1"
            >
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              Reset
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            fullWidth
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

