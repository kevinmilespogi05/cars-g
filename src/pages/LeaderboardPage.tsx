import React, { useState, useEffect, useRef } from 'react';
import { getLeaderboard } from '../lib/points';
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
type SortField = 'points' | 'reports_submitted' | 'reports_verified' | 'reports_resolved';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'card';

const ITEMS_PER_PAGE = 10;
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
  }, [timeFrame, sortField, sortOrder]);

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
        const filteredData = currentUser?.role === 'admin'
          ? cachedData.data
          : cachedData.data.filter(entry => entry.role !== 'admin');
        setEntries(filteredData);
        setLoading(false);
        return;
      }

      const data = await getLeaderboard();
      
      // Filter out admin users if current user is not an admin
      const filteredData = currentUser?.role === 'admin'
        ? data
        : data.filter(entry => entry.role !== 'admin') || [];
      
      // Add rank to filtered data (after filtering out admins)
      const rankedData = filteredData.map((entry, index) => ({
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
    const currentRank = entries.findIndex(e => e.id === entry.id) + 1;
    const previousEntry = previousEntries.find(e => e.id === entry.id);
    if (!previousEntry) return null;
    
    const previousRank = previousEntries.findIndex(e => e.id === entry.id) + 1;
    if (previousRank === 0) return null;
    
    const change = previousRank - currentRank;
    if (change === 0) return null;
    
    return change > 0 ? 'up' : 'down';
  };

  const sortedAndFilteredEntries = entries
    .filter(entry => entry.username.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aValue = a[sortField] || 0;
      const bValue = b[sortField] || 0;
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const totalPages = Math.ceil(sortedAndFilteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = sortedAndFilteredEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const topThreeEntries = sortedAndFilteredEntries.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Community Leaderboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            See who's making the biggest impact in our community
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <label htmlFor="timeframe-select" className="sr-only">Filter by time frame</label>
            <select
              id="timeframe-select"
              aria-label="Filter by time frame"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
              <option value="today">Today</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-md ${
                viewMode === 'table' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-2 rounded-md ${
                viewMode === 'card' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
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
      ) : error ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-red-500">{error}</div>
          <button
            onClick={fetchLeaderboard}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {showTopThree && topThreeEntries.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Contributors</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topThreeEntries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white shadow rounded-lg overflow-hidden"
                  >
                    <div className="p-4 flex flex-col items-center">
                      <div className="relative">
                        {entry.avatar_url ? (
                          <img
                            className="h-20 w-20 rounded-full border-4 border-white shadow-lg"
                            src={entry.avatar_url}
                            alt={`Profile picture of ${entry.username}`}
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                            <User className="h-10 w-10 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1">
                          {getRankIcon(index + 1)}
                        </div>
                      </div>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">{entry.username}</h3>
                      <p className="text-sm text-gray-500">{entry.points.toLocaleString()} points</p>
                      <div className="mt-2 flex space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {entry.reports_submitted || 0} reports
                        </span>
                        {entry.reports_verified && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {entry.reports_verified} verified
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {timeFrame === 'all' ? 'All Time Rankings' :
                     timeFrame === 'month' ? 'This Month\'s Rankings' :
                     timeFrame === 'week' ? 'This Week\'s Rankings' :
                     'Today\'s Rankings'}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    {sortedAndFilteredEntries.length} users
                  </span>
                  <button
                    onClick={() => setShowTopThree(!showTopThree)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showTopThree ? 'Hide Top 3' : 'Show Top 3'}
                  </button>
                </div>
              </div>
            </div>
            
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        User
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('points')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Points</span>
                          <ArrowUpDown className="h-4 w-4" />
                          {sortField === 'points' && (
                            <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('reports_submitted')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Reports</span>
                          <ArrowUpDown className="h-4 w-4" />
                          {sortField === 'reports_submitted' && (
                            <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('reports_verified')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Verified</span>
                          <ArrowUpDown className="h-4 w-4" />
                          {sortField === 'reports_verified' && (
                            <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <AnimatePresence>
                      {paginatedEntries.map((entry) => (
                        <motion.tr 
                          key={entry.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedUser(entry)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              {getRankIcon(entries.findIndex(e => e.id === entry.id) + 1)}
                              {getRankChange(entry) && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="ml-1"
                                >
                                  {getRankChange(entry) === 'up' ? (
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
                                  )}
                                </motion.div>
                              )}
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
                                <Link
                                  to={`/profile/${entry.id}`}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {entry.username}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {entry.points.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {entry.reports_submitted || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {entry.reports_verified || 0}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                <AnimatePresence>
                  {paginatedEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                      onClick={() => setSelectedUser(entry)}
                    >
                      <div className="p-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            {entry.avatar_url ? (
                              <img
                                className="h-12 w-12 rounded-full"
                                src={entry.avatar_url}
                                alt={`Profile picture of ${entry.username}`}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex items-center">
                              <Link
                                to={`/profile/${entry.id}`}
                                className="text-base font-medium text-blue-600 hover:text-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {entry.username}
                              </Link>
                              {getRankChange(entry) && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="ml-1"
                                >
                                  {getRankChange(entry) === 'up' ? (
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
                                  )}
                                </motion.div>
                              )}
                            </div>
                            <div className="flex items-center mt-1">
                              <div className="flex items-center">
                                {getRankIcon(entries.findIndex(e => e.id === entry.id) + 1)}
                                <span className="ml-1 text-sm text-gray-500">#{entries.findIndex(e => e.id === entry.id) + 1}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500">Points</p>
                            <p className="text-sm font-medium">{entry.points.toLocaleString()}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500">Reports</p>
                            <p className="text-sm font-medium">{entry.reports_submitted || 0}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500">Verified</p>
                            <p className="text-sm font-medium">{entry.reports_verified || 0}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500">Resolved</p>
                            <p className="text-sm font-medium">{entry.reports_resolved || 0}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedAndFilteredEntries.length)}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredEntries.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{sortedAndFilteredEntries.length}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === i + 1
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedUser && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg max-w-lg w-full"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">User Statistics</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {selectedUser.avatar_url ? (
                    <img
                      className="h-16 w-16 rounded-full"
                      src={selectedUser.avatar_url}
                      alt={`Profile picture of ${selectedUser.username}`}
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="ml-4">
                  <h4 className="text-xl font-medium text-gray-900">{selectedUser.username}</h4>
                  <p className="text-sm text-gray-700">Rank #{entries.findIndex(e => e.id === selectedUser.id) + 1}</p>
                  {getRankChange(selectedUser) && (
                    <p className="text-sm text-gray-700">
                      {getRankChange(selectedUser) === 'up' ? '↑ Moved up' : '↓ Moved down'} in rankings
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700">Total Points</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {selectedUser.points.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700">Reports Submitted</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {selectedUser.reports_submitted || 0}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700">Reports Verified</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {selectedUser.reports_verified || 0}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700">Reports Resolved</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {selectedUser.reports_resolved || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200">
              <Link
                to={`/profile/${selectedUser.id}`}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                View Full Profile
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
} 