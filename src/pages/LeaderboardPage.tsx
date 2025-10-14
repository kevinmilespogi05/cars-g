import React, { useState, useEffect, useMemo } from 'react';
import { getLeaderboard } from '../lib/points';
import { Trophy, Medal, Award, User, Search, ChevronLeft, ChevronRight, ArrowUpDown, TrendingUp, Shield, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

interface LeaderboardEntry {
  id: string;
  username: string;
  points: number;
  avatar_url: string | null;
  rank?: number;
  reports_submitted?: number;
  reports_verified?: number;
  reports_resolved?: number;
  previous_rank?: number;
  role?: string;
}

type TimeFrame = 'all' | 'month' | 'week' | 'today';
type SortField = 'points' | 'reports_submitted' | 'reports_verified' | 'reports_resolved';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 15;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  data: LeaderboardEntry[];
  timestamp: number;
}

export function LeaderboardPage() {
  const { user: currentUser } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [patrolEntries, setPatrolEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [cache, setCache] = useState<Record<TimeFrame, CachedData>>({} as Record<TimeFrame, CachedData>);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFrame]);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      // Check cache first
      const cachedData = cache[timeFrame];
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        const filteredData = currentUser?.role === 'admin'
          ? cachedData.data.filter(entry => entry.role !== 'patrol')
          : cachedData.data.filter(entry => entry.role !== 'admin' && entry.role !== 'patrol');
        
        // Extract patrol officers separately
        const patrolData = cachedData.data.filter(entry => entry.role === 'patrol');
        const rankedPatrolData = patrolData.map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));
        
        setEntries(filteredData);
        setPatrolEntries(rankedPatrolData);
        setLoading(false);
        return;
      }

      const data = await getLeaderboard();
      
      // Filter community members (exclude admin and patrol)
      const communityData = currentUser?.role === 'admin'
        ? data.filter((entry: any) => entry.role !== 'patrol')
        : (data.filter((entry: any) => entry.role !== 'admin' && entry.role !== 'patrol') || []);
      
      // Filter patrol officers
      const patrolData = data.filter((entry: any) => entry.role === 'patrol');
      
      // Add rank to community data
      const rankedCommunityData = communityData.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
      
      // Add rank to patrol data
      const rankedPatrolData = patrolData.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
      
      // Update cache with unfiltered data
      setCache(prev => ({
        ...prev,
        [timeFrame]: {
          data: data,
          timestamp: Date.now()
        }
      }));
      
      setEntries(rankedCommunityData);
      setPatrolEntries(rankedPatrolData);
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  }

  const getRankIcon = (rank: number, sizeClass: string = 'h-8 w-8', colorClass?: string) => {
    switch (rank) {
      case 1:
        return <Trophy className={`${sizeClass} ${colorClass ?? 'text-yellow-500'}`} />;
      case 2:
        return <Medal className={`${sizeClass} ${colorClass ?? 'text-gray-400'}`} />;
      case 3:
        return <Award className={`${sizeClass} ${colorClass ?? 'text-amber-600'}`} />;
      default:
        return null; // No icon for ranks 4+, just show the number
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };


  // Memoize expensive calculations
  const sortedAndFilteredEntries = useMemo(() => {
    return entries
      .filter(entry => entry.username.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aValue = a[sortField] || 0;
        const bValue = b[sortField] || 0;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });
  }, [entries, searchTerm, sortField, sortOrder]);

  const totalPages = useMemo(() => 
    Math.ceil(sortedAndFilteredEntries.length / ITEMS_PER_PAGE), 
    [sortedAndFilteredEntries.length]
  );

  const paginatedEntries = useMemo(() => 
    sortedAndFilteredEntries.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    ), 
    [sortedAndFilteredEntries, currentPage]
  );

  const topThreeEntries = useMemo(() => 
    sortedAndFilteredEntries.slice(0, 3), 
    [sortedAndFilteredEntries]
  );

  return (
    <div className="min-h-screen">
      {/* Clean Header - Full Width Edge-to-Edge */}
      <div className="bg-white border-b border-gray-200 relative z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                Community Leaderboard
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Recognizing our top contributors
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{entries.length}</div>
                <div className="text-sm text-gray-500">Contributors</div>
              </div>
              <div className="h-12 w-px bg-gray-200"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{patrolEntries.length}</div>
                <div className="text-sm text-gray-500">Officers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Clean Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search contributors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            
            {/* Time Filter */}
            <select
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-shadow"
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
              <option value="today">Today</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading leaderboard...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load leaderboard</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
        <>
          {/* Top Contributors Section */}
          {topThreeEntries.length > 0 && (
            <div className="mb-10">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Top Contributors</h2>
                <p className="text-sm text-gray-600 mt-1">Outstanding members of our community</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Display in order: 1st, 2nd, 3rd for desktop */}
                {topThreeEntries.map((entry, idx) => {
                  const rank = idx + 1;
                  const isFirst = rank === 1;
                  const isSecond = rank === 2;
                  const isThird = rank === 3;
                  
                  let borderColor = 'border-gray-200';
                  let bgGradient = 'from-gray-50 to-white';
                  let badgeColor = 'bg-gray-100 text-gray-700';
                  let icon = <Medal className="h-5 w-5" />;
                  
                  if (isFirst) {
                    borderColor = 'border-yellow-200';
                    bgGradient = 'from-yellow-50 to-white';
                    badgeColor = 'bg-yellow-100 text-yellow-700';
                    icon = <Crown className="h-5 w-5" />;
                  } else if (isSecond) {
                    borderColor = 'border-gray-300';
                    bgGradient = 'from-gray-100 to-white';
                    badgeColor = 'bg-gray-200 text-gray-700';
                    icon = <Medal className="h-5 w-5" />;
                  } else if (isThird) {
                    borderColor = 'border-orange-200';
                    bgGradient = 'from-orange-50 to-white';
                    badgeColor = 'bg-orange-100 text-orange-700';
                    icon = <Award className="h-5 w-5" />;
                  }
                  
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`bg-gradient-to-b ${bgGradient} rounded-lg border-2 ${borderColor} p-6 hover:shadow-lg transition-shadow cursor-pointer`}
                      onClick={() => setSelectedUser(entry)}
                    >
                      <div className="flex flex-col items-center text-center">
                        {/* Rank Badge */}
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${badgeColor} text-sm font-semibold mb-4`}>
                          {icon}
                          <span>#{rank}</span>
                        </div>
                        
                        {/* Avatar */}
                        <div className="relative mb-4">
                          {entry.avatar_url ? (
                            <img 
                              src={entry.avatar_url} 
                              alt={entry.username}
                              className={`w-20 h-20 rounded-full object-cover border-4 ${isFirst ? 'border-yellow-400' : isSecond ? 'border-gray-400' : 'border-orange-400'}`}
                            />
                          ) : (
                            <div className={`w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-4 ${isFirst ? 'border-yellow-400' : isSecond ? 'border-gray-400' : 'border-orange-400'}`}>
                              <User className="w-10 h-10 text-gray-500" />
                            </div>
                          )}
                        </div>
                        
                        {/* Username */}
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{entry.username}</h3>
                        
                        {/* Points */}
                        <div className="flex items-center gap-2 text-2xl font-bold text-gray-900 mb-3">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          {entry.points.toLocaleString()}
                        </div>
                        
                        {/* Stats */}
                        <div className="w-full grid grid-cols-2 gap-2 pt-4 border-t border-gray-200">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Reports</div>
                            <div className="text-sm font-semibold text-gray-900">{entry.reports_submitted || 0}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Verified</div>
                            <div className="text-sm font-semibold text-gray-900">{entry.reports_verified || 0}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2-Column Layout: Community Rankings & Patrol Officers */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            
            {/* Community Rankings Column */}
            <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Community Rankings</h2>
                    <p className="text-sm text-gray-600 mt-1">{sortedAndFilteredEntries.length} contributors</p>
                  </div>
                </div>
              </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contributor
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('points')}
                    >
                      <div className="flex items-center gap-2">
                        Points
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('reports_submitted')}
                    >
                      <div className="flex items-center gap-2">
                        Reports
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verified
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEntries.map((entry, idx) => (
                    <tr 
                      key={entry.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedUser(entry)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getRankIcon((currentPage - 1) * ITEMS_PER_PAGE + idx + 1, 'h-6 w-6')}
                          <span className="text-sm font-medium text-gray-900">
                            #{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {entry.avatar_url ? (
                            <img
                              src={entry.avatar_url}
                              alt={entry.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <Link
                              to={`/profile/${entry.id}`}
                              className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {entry.username}
                            </Link>
                            <div className="text-xs text-gray-500">Contributor</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {entry.points.toLocaleString()}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {entry.reports_submitted || 0}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {entry.reports_verified || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedAndFilteredEntries.length)}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredEntries.length)}</span> of{' '}
                    <span className="font-medium">{sortedAndFilteredEntries.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Patrol Officers Column */}
            {patrolEntries.length > 0 && (
              <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Top Patrol Officers</h2>
                        <p className="text-sm text-gray-600 mt-1">{patrolEntries.length} officers</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Officer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                        <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports</th>
                        <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {patrolEntries.slice(0, 10).map((entry, idx) => (
                        <tr 
                          key={entry.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedUser(entry)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getRankIcon(idx + 1, 'h-6 w-6')}
                              <span className="text-sm font-medium text-gray-900">#{idx + 1}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {entry.avatar_url ? (
                                <img
                                  src={entry.avatar_url}
                                  alt={entry.username}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Shield className="w-5 h-5 text-blue-600" />
                                </div>
                              )}
                              <div>
                                <Link
                                  to={`/profile/${entry.id}`}
                                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {entry.username}
                                </Link>
                                <div className="text-xs text-gray-500">Patrol Officer</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              {entry.points.toLocaleString()}
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {entry.reports_submitted || 0}
                            </div>
                          </td>
                          <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700">
                              {entry.reports_verified || '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Contributor Details</h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  {selectedUser.avatar_url ? (
                    <img
                      src={selectedUser.avatar_url}
                      alt={selectedUser.username}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">{selectedUser.username}</h4>
                    <p className="text-sm text-gray-600">
                      Rank #{entries.findIndex(e => e.id === selectedUser.id) + 1}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-gray-600 mb-1">Points</div>
                    <div className="text-2xl font-bold text-gray-900">{selectedUser.points.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-gray-600 mb-1">Reports</div>
                    <div className="text-2xl font-bold text-gray-900">{selectedUser.reports_submitted || 0}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-gray-600 mb-1">Verified</div>
                    <div className="text-2xl font-bold text-gray-900">{selectedUser.reports_verified || 0}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-gray-600 mb-1">Resolved</div>
                    <div className="text-2xl font-bold text-gray-900">{selectedUser.reports_resolved || 0}</div>
                  </div>
                </div>

                <Link
                  to={`/profile/${selectedUser.id}`}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View Full Profile
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
