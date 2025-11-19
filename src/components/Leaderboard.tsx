import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../lib/points';
import { Trophy, Medal, Award, User, Flame, TrendingUp, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfileLinkGuarded from './ProfileLinkGuarded';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { getUserStatsWithCache } from '../lib/achievements';
import { SkeletonLoader } from './ui/SkeletonLoader';

interface LeaderboardEntry {
  id: string;
  username: string;
  points: number;
  avatar_url: string | null;
  rank?: number;
  reports_submitted?: number;
  reports_verified?: number;
}

export function Leaderboard({ limit = 10 }: { limit?: number }) {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<{ streak?: number; level?: number } | null>(null);
  // profile link behavior is handled by ProfileLinkGuarded

  useEffect(() => {
    fetchLeaderboard();
    if (user) {
      fetchUserRank();
      fetchUserStats();
    }
  }, [limit, user]);

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

  const fetchUserRank = async () => {
    if (!user) return;
    try {
      // Get all users ordered by points to find user's rank
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id, points')
        .order('points', { ascending: false });

      if (error) throw error;

      const rank = allUsers?.findIndex(u => u.id === user.id) + 1;
      setUserRank(rank || null);
    } catch (err) {
      console.error('Error fetching user rank:', err);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;
    try {
      const stats = await getUserStatsWithCache(user.id);
      const level = Math.floor((stats.total_points || 0) / 200) + 1; // Level based on points
      setUserStats({
        streak: stats.reporting_streak || 0,
        level
      });
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  };

  const getLevelBadge = (level: number) => {
    if (level >= 5) return { icon: '🌟', color: 'text-yellow-600', label: 'Master' };
    if (level >= 4) return { icon: '⭐', color: 'text-purple-600', label: 'Expert' };
    if (level >= 3) return { icon: '✨', color: 'text-blue-600', label: 'Advanced' };
    if (level >= 2) return { icon: '💫', color: 'text-green-600', label: 'Intermediate' };
    return { icon: '🌱', color: 'text-gray-600', label: 'Beginner' };
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
        <div className="space-y-4">
          {[...Array(limit)].map((_, i) => (
            <SkeletonLoader key={i} variant="rectangular" height="60px" className="rounded-lg" />
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

  const isCurrentUser = (entryId: string) => user?.id === entryId;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Community Leaderboard</h2>
            <p className="text-sm text-slate-500">Top contributors this month</p>
          </div>
          {userRank && (
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900">Your Rank</div>
              <div className="text-lg font-bold text-blue-600">#{userRank}</div>
            </div>
          )}
        </div>
        {userStats && (
          <div className="mt-3 flex items-center gap-4 text-sm">
            {userStats.streak && userStats.streak > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <Flame className="h-4 w-4" />
                <span className="font-semibold">{userStats.streak} day streak</span>
              </div>
            )}
            {userStats.level && (
              <div className="flex items-center gap-1">
                <span className={getLevelBadge(userStats.level).color}>
                  {getLevelBadge(userStats.level).icon}
                </span>
                <span className="text-slate-600">
                  Level {userStats.level} - {getLevelBadge(userStats.level).label}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <ul className="divide-y divide-gray-100">
        {entries.map((entry, index) => {
          const rank = entry.rank ?? index + 1;
          const rankClass = rank === 1 ? 'bg-yellow-50 text-yellow-700' : rank === 2 ? 'bg-slate-50 text-slate-700' : rank === 3 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-700';
          const isUser = isCurrentUser(entry.id);
          const entryLevel = Math.floor(entry.points / 200) + 1;
          const levelBadge = getLevelBadge(entryLevel);
          
          return (
            <li 
              key={entry.id} 
              className={`px-6 py-4 hover:bg-slate-50 transition-colors ${
                isUser ? 'bg-blue-50 border-l-4 border-blue-600' : ''
              }`}
            >
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
                  <div className="flex items-center gap-2">
                    <ProfileLinkGuarded to={`/profile/${entry.id}`} className="block text-sm font-semibold text-slate-900 hover:text-blue-600 truncate">
                      {entry.username}
                      {isUser && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                    </ProfileLinkGuarded>
                    <span className={levelBadge.color} title={`Level ${entryLevel}`}>
                      {levelBadge.icon}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>{entry.reports_submitted || 0} reports</span>
                    {entry.reports_verified && entry.reports_verified > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500" />
                        {entry.reports_verified} verified
                      </span>
                    )}
                  </div>
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