import React from 'react';
import { AnnouncementsDisplay } from '../components/AnnouncementsDisplay';
import { MobileBackToReports } from '../components/MobileBackToReports';

export function Announcements() {
  return (
    <>
      <MobileBackToReports />
      <div className="min-h-screen bg-primary-50/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnnouncementsDisplay />
        </div>
      </div>
    </>
  );
}
