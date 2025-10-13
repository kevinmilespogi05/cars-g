import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Award, User, MapPin, MessageCircle, Shield, Home } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { QuickActions } from './QuickActions';
import { MotivationalQuote } from './MotivationalQuote';

/**
 * SideNav Component
 * 
 * Left sidebar navigation for the Reports page featuring:
 * - Breadcrumb navigation
 * - Role-based navigation menu
 * - Verification Reports link (for eligible users)
 * - Quick Actions section
 * - Motivational Quote section
 * 
 * Customization:
 * - Modify navigation items in getNavItems() function
 * - Adjust sticky positioning via the sticky top-* class
 * - Update styling via Tailwind classes
 * - Add/remove sections as needed
 */

export function SideNav() {
  const location = useLocation();
  const { user } = useAuthStore();

  // Determine navigation items based on user role
  const getNavItems = () => {
    if (user?.role === 'admin') {
      return [
        { path: '/admin', icon: Home, label: 'Dashboard' },
        { path: '/admin/map', icon: MapPin, label: 'Map View' },
        { path: '/reports', icon: FileText, label: 'Reports' },
        { path: '/leaderboard', icon: Award, label: 'Leaderboard' },
        { path: '/admin/chat', icon: MessageCircle, label: 'Chat' }
      ];
    } else if (user?.role === 'patrol') {
      return [
        { path: '/patrol', icon: Home, label: 'Dashboard' },
        { path: '/reports', icon: FileText, label: 'Reports' },
        { path: '/leaderboard', icon: Award, label: 'Leaderboard' }
      ];
    } else {
      // Regular users
      return [
        { path: '/reports', icon: FileText, label: 'Reports' },
        { path: '/leaderboard', icon: Award, label: 'Leaderboard' },
        { path: '/profile', icon: User, label: 'My Profile' }
      ];
    }
  };

  const navItems = getNavItems();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link to="/" className="hover:text-gray-700 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Reports</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3 px-2">
          Navigation
        </h3>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Verification Reports Link - Show for all authenticated users */}
        {user && (
          <>
            <div className="border-t border-gray-200 my-3"></div>
            <Link
              to="/verification-reports"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all"
            >
              <Shield className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Verification</span>
            </Link>
          </>
        )}
      </nav>

      {/* Quick Actions Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Quick Actions
          </h2>
          <p className="text-xs text-gray-500">
            Access common tasks
          </p>
        </div>
        
        {/* Integrate the existing QuickActions component with sidebar variant */}
        <QuickActions hideEmergencyActions variant="sidebar" />
      </div>

      {/* Motivational Quote Section */}
      <MotivationalQuote />
    </div>
  );
}

