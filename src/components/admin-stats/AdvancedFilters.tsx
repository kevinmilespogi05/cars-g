import React, { useState } from 'react';
import { Filter, X, Search, MapPin, Tag, Users, Calendar } from 'lucide-react';

export interface FilterOptions {
  categories: string[];
  locations: string[];
  statuses: string[];
  userGroups: string[];
  dateRange: { start: string; end: string };
  customTags: string[];
}

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  availableCategories: string[];
  availableLocations: string[];
  availableStatuses: string[];
}

export function AdvancedFilters({ 
  onFilterChange, 
  availableCategories,
  availableLocations,
  availableStatuses 
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    locations: [],
    statuses: [],
    userGroups: [],
    dateRange: { start: '', end: '' },
    customTags: [],
  });
  const [searchTerm, setSearchTerm] = useState('');

  const handleFilterUpdate = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleFilter = (key: keyof FilterOptions, value: string) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    handleFilterUpdate(key, updated);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      categories: [],
      locations: [],
      statuses: [],
      userGroups: [],
      dateRange: { start: '', end: '' },
      customTags: [],
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = () => {
    return filters.categories.length > 0 ||
           filters.locations.length > 0 ||
           filters.statuses.length > 0 ||
           filters.userGroups.length > 0 ||
           filters.dateRange.start ||
           filters.dateRange.end ||
           filters.customTags.length > 0;
  };

  const activeFilterCount = () => {
    return filters.categories.length +
           filters.locations.length +
           filters.statuses.length +
           filters.userGroups.length +
           filters.customTags.length +
           (filters.dateRange.start ? 1 : 0) +
           (filters.dateRange.end ? 1 : 0);
  };

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
          hasActiveFilters()
            ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
        {hasActiveFilters() && (
          <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
            {activeFilterCount()}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 rounded-t-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Search within filters */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search filters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Date Range */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-900">Date Range</h4>
              </div>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterUpdate('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterUpdate('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="End date"
                />
              </div>
            </div>

            {/* Categories */}
            {availableCategories.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-900">Categories</h4>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableCategories
                    .filter(cat => !searchTerm || cat.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((category) => (
                      <label key={category} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.categories.includes(category)}
                          onChange={() => toggleFilter('categories', category)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                </div>
              </div>
            )}

            {/* Locations */}
            {availableLocations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-900">Locations</h4>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableLocations
                    .filter(loc => !searchTerm || loc.toLowerCase().includes(searchTerm.toLowerCase()))
                    .slice(0, 20)
                    .map((location) => (
                      <label key={location} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.locations.includes(location)}
                          onChange={() => toggleFilter('locations', location)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 truncate">{location}</span>
                      </label>
                    ))}
                </div>
              </div>
            )}

            {/* Report Status */}
            {availableStatuses.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-900">Status</h4>
                </div>
                <div className="space-y-1">
                  {availableStatuses.map((status) => (
                    <label key={status} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.statuses.includes(status)}
                        onChange={() => toggleFilter('statuses', status)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{(status === 'declined' || status === 'rejected') ? 'Declined' : status.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* User Groups */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-900">User Groups</h4>
              </div>
              <div className="space-y-1">
                {['Active Users', 'Banned Users', 'New Users (7 days)', 'Power Users (10+ reports)'].map((group) => (
                  <label key={group} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.userGroups.includes(group)}
                      onChange={() => toggleFilter('userGroups', group)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{group}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-3 rounded-b-lg flex gap-2">
            <button
              onClick={clearAllFilters}
              className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear All
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

