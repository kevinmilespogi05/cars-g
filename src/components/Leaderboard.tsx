import React, { useState, useEffect } from 'react';
import { getLeaderboardForUser } from '../lib/points';
import { Trophy, Medal, Award, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface LeaderboardEntry {
  id: string;
  username: string;
  points: number;
  avatar_url: string | null;
  rank?: number;
  role?: string;
}

export function Leaderboard({ limit = 10 }: { limit?: number }) {
  const { user: currentUser } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [limit, currentUser?.role]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Use the new function that automatically handles admin filtering
      const data = await getLeaderboardForUser(limit, currentUser?.role);
      
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
        <div className="text-red-600 text-center py-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Community Leaderboard</h2>
      
      <ul className="space-y-2">
        {entries.map((entry, index) => (
          <li key={entry.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                {getRankIcon(index + 1)}
              </div>
              
              <div className="ml-4 flex-shrink-0">
                {entry.avatar_url ? (
                  <img
                    className="h-10 w-10 rounded-full"
                    src={entry.avatar_url}
                    alt={`Profile picture of ${entry.username}`}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="ml-4 flex-1">
                <Link
                  to={`/profile/${entry.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {entry.username}
                </Link>
                <p className="text-sm text-gray-700">
                  {entry.points.toLocaleString()} points
                </p>
              </div>
              
              <div className="ml-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  #{index + 1}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      <div className="px-6 py-4 border-t border-gray-200">
        <Link
          to="/leaderboard"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          View full leaderboard →
        </Link>
      </div>
    </div>
  );
} 