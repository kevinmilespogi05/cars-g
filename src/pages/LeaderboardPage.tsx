import React, { useState, useEffect, useRef } from 'react';
import { getLeaderboardForUser } from '../lib/points';
import { Trophy, Medal, Award, User, Calendar, Filter, Search, ChevronLeft, ChevronRight, ArrowUpDown, Star, TrendingUp, Zap } from 'lucide-react';
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
type SortField = 'points' | 'username' | 'reports_submitted' | 'reports_verified';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  data: LeaderboardEntry[];
  timestamp: number;
}

export function LeaderboardPage() {
  const { user: currentUser } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [cache, setCache] = useState<Record<TimeFrame, CachedData>>({} as Record<TimeFrame, CachedData>);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showTopThree, setShowTopThree] = useState(true);
  const [previousEntries, setPreviousEntries] = useState<LeaderboardEntry[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFrame, sortField, sortOrder, currentUser?.role]);

  useEffect(() => {
    // Focus search input when component mounts
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Store previous entries for animation
    if (entries.length > 0) {
      setPreviousEntries(entries);
    }
  }, [entries]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Check cache first
      const cachedData = cache[timeFrame];
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        // Use cached data with automatic admin filtering
        const data = await getLeaderboardForUser(1000, currentUser?.role); // Get all data for filtering
        setEntries(data);
        setLoading(false);
        return;
      }

      // Fetch fresh data with automatic admin filtering
      const data = await getLeaderboardForUser(1000, currentUser?.role);
      
      // Add rank to data
      const rankedData = data.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
      
      // Update cache with data
      setCache(prev => ({
        ...prev,
        [timeFrame]: {
          data: data,
          timestamp: Date.now()
        }
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
        return <Trophy className="h-8 w-8 text-yellow-500" />;
      case 2:
        return <Medal className="h-8 w-8 text-gray-400" />;
      case 3:
        return <Award className="h-8 w-8 text-amber-600" />;
      default:
        return <span className="text-2xl font-bold text-gray-500">{rank}</span>;
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

  const getRankChange = (entry: LeaderboardEntry) => {
    if (!previousEntries.length) return null;
    
    const previousEntry = previousEntries.find(prev => prev.id === entry.id);
    if (!previousEntry || !previousEntry.rank || !entry.rank) return null;
    
    const change = previousEntry.rank - entry.rank;
    if (change === 0) return null;
    
    return {
      direction: change > 0 ? 'up' : 'down',
      value: Math.abs(change)
    };
  };

  // Filter and sort entries based on current state
  const filteredAndSortedEntries = entries
    .filter(entry => 
      entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.points.toString().includes(searchTerm)
    )
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
        if (sortOrder === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      }
      
      return 0;
    });

  // Pagination
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredAndSortedEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = filteredAndSortedEntries.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Leaderboard</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Leaderboard</h1>
          <p className="text-gray-600">
            Top contributors and most active community members
            {currentUser?.role === 'admin' && ' (Admin view - showing all users)'}
          </p>
        </div>

        {/* Top 3 Podium */}
        {showTopThree && entries.length >= 3 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 3</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 2nd Place */}
              {entries[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-lg shadow-md p-6 text-center order-1 md:order-2"
                >
                  <div className="flex justify-center mb-4">
                    <Medal className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">#{2}</h3>
                  <div className="mb-4">
                    {entries[1].avatar_url ? (
                      <img
                        className="h-16 w-16 rounded-full mx-auto"
                        src={entries[1].avatar_url}
                        alt={`Profile picture of ${entries[1].username}`}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-1">
                    <Link
                      to={`/profile/${entries[1].id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {entries[1].username}
                    </Link>
                  </h4>
                  <p className="text-2xl font-bold text-gray-400">{entries[1].points.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">points</p>
                </motion.div>
              )}

              {/* 1st Place */}
              {entries[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                  className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg p-6 text-center order-2 md:order-1 transform scale-105"
                >
                  <div className="flex justify-center mb-4">
                    <Trophy className="h-16 w-16 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">#{1}</h3>
                  <div className="mb-4">
                    {entries[0].avatar_url ? (
                      <img
                        className="h-20 w-20 rounded-full mx-auto border-4 border-white"
                        src={entries[0].avatar_url}
                        alt={`Profile picture of ${entries[0].username}`}
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-white mx-auto flex items-center justify-center border-4 border-white">
                        <User className="h-10 w-10 text-yellow-600" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-1">
                    <Link
                      to={`/profile/${entries[0].id}`}
                      className="hover:text-yellow-200 transition-colors"
                    >
                      {entries[0].username}
                    </Link>
                  </h4>
                  <p className="text-3xl font-bold text-white">{entries[0].points.toLocaleString()}</p>
                  <p className="text-sm text-yellow-100">points</p>
                </motion.div>
              )}

              {/* 3rd Place */}
              {entries[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-lg shadow-md p-6 text-center order-3"
                >
                  <div className="flex justify-center mb-4">
                    <Award className="h-12 w-12 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">#{3}</h3>
                  <div className="mb-4">
                    {entries[2].avatar_url ? (
                      <img
                        className="h-16 w-16 rounded-full mx-auto"
                        src={entries[2].avatar_url}
                        alt={`Profile picture of ${entries[2].username}`}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-1">
                    <Link
                      to={`/profile/${entries[2].id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {entries[2].username}
                    </Link>
                  </h4>
                  <p className="text-2xl font-bold text-amber-600">{entries[2].points.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">points</p>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cards
              </button>
            </div>

            {/* Toggle Top 3 */}
            <button
              onClick={() => setShowTopThree(!showTopThree)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showTopThree ? 'Hide' : 'Show'} Top 3
            </button>
          </div>
        </div>

        {/* Leaderboard Table */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('points')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Points</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('reports_submitted')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Reports</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('reports_verified')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Verified</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentEntries.map((entry, index) => {
                    const rankChange = getRankChange(entry);
                    return (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getRankIcon(startIndex + index + 1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
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
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                <Link
                                  to={`/profile/${entry.id}`}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {entry.username}
                                </Link>
                              </div>
                              {entry.role === 'admin' && (
                                <div className="text-xs text-red-600 font-medium">Admin</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {entry.points.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {entry.reports_submitted || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {entry.reports_verified || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {rankChange && (
                            <div className={`flex items-center text-sm ${
                              rankChange.direction === 'up' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {rankChange.direction === 'up' ? (
                                <TrendingUp className="h-4 w-4 mr-1" />
                              ) : (
                                <Zap className="h-4 w-4 mr-1" />
                              )}
                              {rankChange.value}
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leaderboard Cards */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentEntries.map((entry, index) => {
              const rankChange = getRankChange(entry);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      {getRankIcon(startIndex + index + 1)}
                    </div>
                    <div className="mb-4">
                      {entry.avatar_url ? (
                        <img
                          className="h-16 w-16 rounded-full mx-auto"
                          src={entry.avatar_url}
                          alt={`Profile picture of ${entry.username}`}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      <Link
                        to={`/profile/${entry.id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {entry.username}
                      </Link>
                    </h3>
                    {entry.role === 'admin' && (
                      <div className="text-xs text-red-600 font-medium mb-2">Admin</div>
                    )}
                    <p className="text-2xl font-bold text-blue-600 mb-2">
                      {entry.points.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mb-3">points</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Reports</p>
                        <p className="font-medium">{entry.reports_submitted || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Verified</p>
                        <p className="font-medium">{entry.reports_verified || 0}</p>
                      </div>
                    </div>
                    
                    {rankChange && (
                      <div className={`mt-3 text-sm ${
                        rankChange.direction === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {rankChange.direction === 'up' ? (
                          <TrendingUp className="h-4 w-4 inline mr-1" />
                        ) : (
                          <Zap className="h-4 w-4 inline mr-1" />
                        )}
                        {rankChange.value} rank change
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          </div>
        )}

        {/* User Details Modal */}
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
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4">User Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Username:</span> {selectedUser.username}
                  </div>
                  <div>
                    <span className="font-medium">Points:</span> {selectedUser.points.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Reports Submitted:</span> {selectedUser.reports_submitted || 0}
                  </div>
                  <div>
                    <span className="font-medium">Reports Verified:</span> {selectedUser.reports_verified || 0}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 