import React from 'react';
import { AnnouncementsDisplay } from '../components/AnnouncementsDisplay';

export function Announcements() {
  return (
    <div className="min-h-screen bg-primary-50/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnnouncementsDisplay />
      </div>
    </div>
  );
}
