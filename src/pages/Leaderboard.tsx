import React from 'react';
import { Trophy, Award, Medal } from 'lucide-react';

export function Leaderboard() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Community Leaderboard</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 font-semibold text-gray-700">
          <div>Rank</div>
          <div>User</div>
          <div>Points</div>
          <div>Level</div>
        </div>
        
        <div className="divide-y divide-gray-200">
          <div className="grid grid-cols-4 gap-4 p-4 items-center bg-yellow-50">
            <div className="flex items-center">
              <Trophy className="h-5 w-5 text-yellow-600 mr-2" />
              1
            </div>
            <div>JohnDoe</div>
            <div>1,250</div>
            <div>Expert</div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 p-4 items-center bg-gray-50">
            <div className="flex items-center">
              <Award className="h-5 w-5 text-gray-600 mr-2" />
              2
            </div>
            <div>JaneSmith</div>
            <div>980</div>
            <div>Pro</div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 p-4 items-center bg-orange-50">
            <div className="flex items-center">
              <Medal className="h-5 w-5 text-orange-600 mr-2" />
              3
            </div>
            <div>BobJohnson</div>
            <div>750</div>
            <div>Advanced</div>
          </div>
        </div>
      </div>
    </div>
  );
}