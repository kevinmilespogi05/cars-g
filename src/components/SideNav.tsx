import React from 'react';
import { Link } from 'react-router-dom';
import { QuickActions } from './QuickActions';
import { MotivationalQuote } from './MotivationalQuote';
import { EmergencyContacts } from './EmergencyContacts';

/**
 * SideNav Component
 * 
 * Left sidebar navigation for the Reports page featuring:
 * - Breadcrumb navigation
 * - Emergency Contacts section
 * - Quick Actions section
 * - Motivational Quote section
 * 
 * Customization:
 * - Adjust sticky positioning via the sticky top-* class
 * - Update styling via Tailwind classes
 * - Add/remove sections as needed
 */

export function SideNav() {

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link to="/" className="hover:text-gray-700 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Reports</span>
        </div>
      </div>

      {/* Emergency Contacts Section */}
      <EmergencyContacts />

      {/* Quick Actions Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="mb-2.5">
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

