import React from 'react';
import { MainEmergencyContacts } from '../components/MainEmergencyContacts';

export function EmergencyContacts() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Emergency Contacts
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mt-1">
                Quick access to essential emergency services and contacts
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Contacts Component */}
        <div className="max-w-4xl">
          <MainEmergencyContacts />
        </div>
      </div>
    </div>
  );
}
