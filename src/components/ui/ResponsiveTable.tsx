import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ResponsiveTableColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  mobileHidden?: boolean;
  priority?: 'high' | 'medium' | 'low'; // For mobile: high = always show, low = hide on small screens
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  mobileView?: 'cards' | 'table' | 'auto'; // auto = cards on mobile, table on desktop
  renderMobileCard?: (row: T) => React.ReactNode;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  className,
  mobileView = 'auto',
  renderMobileCard
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSort = (column: ResponsiveTableColumn<T>) => {
    if (!column.sortable) return;
    
    setSortConfig(prev => {
      if (prev?.key === column.key) {
        return { key: column.key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: column.key, direction: 'asc' };
    });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
    const column = columns.find(c => c.key === sortConfig.key);
    if (!column) return data;

    return [...data].sort((a, b) => {
      const aValue = column.accessor(a);
      const bValue = column.accessor(b);
      
      // Simple string/number comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  }, [data, sortConfig, columns]);

  // Mobile card view
  if ((mobileView === 'cards' || (mobileView === 'auto' && isMobile)) && renderMobileCard) {
    return (
      <div className={cn('space-y-3', className)}>
        {sortedData.map(row => (
          <div key={keyExtractor(row)}>
            {renderMobileCard(row)}
          </div>
        ))}
      </div>
    );
  }

  // Mobile table with collapsible rows
  if (mobileView === 'auto' && isMobile) {
    const primaryColumns = columns.filter(c => c.priority === 'high' || !c.mobileHidden);
    const secondaryColumns = columns.filter(c => c.priority !== 'high' && c.mobileHidden);

    return (
      <div className={cn('space-y-2', className)}>
        {sortedData.map(row => {
          const key = keyExtractor(row);
          const isExpanded = expandedRows.has(key);
          
          return (
            <div
              key={key}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Primary row - always visible */}
              <div
                className={cn(
                  'p-3 flex items-center justify-between',
                  onRowClick && 'cursor-pointer hover:bg-gray-50',
                  secondaryColumns.length > 0 && 'border-b border-gray-100'
                )}
                onClick={() => {
                  if (secondaryColumns.length > 0) {
                    toggleRow(key);
                  } else if (onRowClick) {
                    onRowClick(row);
                  }
                }}
              >
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {primaryColumns.slice(0, 2).map(column => (
                    <div key={column.key}>
                      <div className="text-xs text-gray-500 mb-0.5">{column.header}</div>
                      <div className="text-sm font-medium text-gray-900">
                        {column.accessor(row)}
                      </div>
                    </div>
                  ))}
                </div>
                {secondaryColumns.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(key);
                    }}
                    className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                    aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && secondaryColumns.length > 0 && (
                <div className="p-3 bg-gray-50 border-t border-gray-100 space-y-2">
                  {secondaryColumns.map(column => (
                    <div key={column.key} className="flex justify-between">
                      <span className="text-xs text-gray-500">{column.header}:</span>
                      <span className="text-sm text-gray-900 text-right">
                        {column.accessor(row)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map(column => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider',
                  column.sortable && 'cursor-pointer hover:bg-gray-100',
                  column.mobileHidden && 'hidden md:table-cell'
                )}
                onClick={() => column.sortable && handleSort(column)}
                scope="col"
              >
                <div className="flex items-center gap-2">
                  <span>{column.header}</span>
                  {column.sortable && sortConfig?.key === column.key && (
                    sortConfig.direction === 'asc' ? (
                      <ChevronUp className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-blue-600" />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map(row => (
            <tr
              key={keyExtractor(row)}
              className={cn(
                'hover:bg-gray-50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(column => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-sm text-gray-900',
                    column.mobileHidden && 'hidden md:table-cell'
                  )}
                >
                  {column.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

