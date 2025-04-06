import React from 'react';
import { useAuthStore } from '../store/authStore';

export function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Stats Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Your Stats</h2>
          <div className="space-y-2">
            <p className="text-gray-600">Points: <span className="font-medium text-gray-900">{user?.points || 0}</span></p>
            <p className="text-gray-600">Rank: <span className="font-medium text-gray-900">{user?.rank || 'Newcomer'}</span></p>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <p className="text-gray-600">Coming soon...</p>
        </div>

        {/* Achievements Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Latest Achievements</h2>
          <p className="text-gray-600">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}