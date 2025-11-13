import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../lib/points';
import { Trophy, Medal, Award, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfileLinkGuarded from './ProfileLinkGuarded';

interface LeaderboardEntry {
  id: string;
  username: string;
  points: number;
  avatar_url: string | null;
  rank?: number;
}

export function Leaderboard({ limit = 10 }: { limit?: number }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // profile link behavior is handled by ProfileLinkGuarded

  useEffect(() => {
    fetchLeaderboard();
  }, [limit]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard(limit);
      
      // Add rank to each entry
      const rankedData = data.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
      
      setEntries(rankedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-500">{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Community Leaderboard</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Community Leaderboard</h2>
        <div className="text-red-500">{error}</div>
        <button
          onClick={fetchLeaderboard}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Community Leaderboard</h2>
            <p className="text-sm text-slate-500">Top contributors this month</p>
          </div>
          <div className="text-sm text-slate-500">Clean, modern UI • Responsive</div>
        </div>
      </div>

      <ul className="divide-y divide-gray-100">
        {entries.map((entry, index) => {
          const rank = entry.rank ?? index + 1;
          const rankClass = rank === 1 ? 'bg-yellow-50 text-yellow-700' : rank === 2 ? 'bg-slate-50 text-slate-700' : rank === 3 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-700';
          return (
            <li key={entry.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center w-12 flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rankClass} font-semibold`}>{getRankIcon(rank)}</div>
                  <div className="text-xs text-slate-400 mt-1">#{rank}</div>
                </div>

                <div className="flex-shrink-0">
                  {entry.avatar_url ? (
                    <img className="h-12 w-12 rounded-full object-cover" src={entry.avatar_url} alt={`Profile of ${entry.username}`} />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <ProfileLinkGuarded to={`/profile/${entry.id}`} className="block text-sm font-semibold text-slate-900 hover:text-blue-600 truncate">
                    {entry.username}
                  </ProfileLinkGuarded>
                  <div className="mt-1 text-xs text-slate-500">Contributed this month</div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-900">{entry.points.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">points</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
} 