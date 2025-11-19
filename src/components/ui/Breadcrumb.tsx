import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

export function Breadcrumb({ items, className, showHome = true }: BreadcrumbProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const generated: BreadcrumbItem[] = [];
    
    if (showHome) {
      generated.push({ label: 'Home', path: '/', icon: <Home className="h-4 w-4" /> });
    }

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      generated.push({
        label,
        path: index === pathSegments.length - 1 ? undefined : currentPath,
      });
    });

    return generated;
  })();

  return (
    <nav
      className={cn('flex items-center space-x-1 text-sm text-gray-600', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-1" aria-hidden="true" />
              )}
              {isLast ? (
                <span
                  className={cn(
                    'flex items-center gap-1.5 font-medium text-gray-900',
                    item.icon && 'gap-1.5'
                  )}
                  aria-current="page"
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  {item.label}
                </span>
              ) : item.path ? (
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-1.5 hover:text-gray-900 transition-colors',
                    item.icon && 'gap-1.5'
                  )}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  {item.label}
                </Link>
              ) : (
                <span className="flex items-center gap-1.5">
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

