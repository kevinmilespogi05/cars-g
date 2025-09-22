import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getLeaderboard } from '../lib/points';
import { Trophy, Medal, Award, User, Calendar, Filter, Search, ChevronLeft, ChevronRight, ArrowUpDown, Star, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
          ? cachedData.data.filter(entry => entry.role !== 'patrol')
          : cachedData.data.filter(entry => entry.role !== 'admin' && entry.role !== 'patrol');
        setEntries(filteredData);
        setLoading(false);
        return;
      }

      const data = await getLeaderboard();
      
      // Filter out admin users if current user is not an admin
      const filteredData = currentUser?.role === 'admin'
        ? data.filter((entry: any) => entry.role !== 'patrol')
        : (data.filter((entry: any) => entry.role !== 'admin' && entry.role !== 'patrol') || []);
      
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

  const getRankIcon = (rank: number, sizeClass: string = 'h-8 w-8', colorClass?: string) => {
    switch (rank) {
      case 1:
        return <Trophy className={`${sizeClass} ${colorClass ?? 'text-yellow-500'}`} />;
      case 2:
        return <Medal className={`${sizeClass} ${colorClass ?? 'text-gray-400'}`} />;
      case 3:
        return <Award className={`${sizeClass} ${colorClass ?? 'text-amber-600'}`} />;
      default:
        return <span className={`font-bold text-gray-500 ${sizeClass.replace('w-', 'text-')}`}>{rank}</span>;
    }
  };

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }, [sortField]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        
        {/* Modern Controls */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search contributors..."
                  className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Time Filter */}
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <label htmlFor="timeframe-select" className="sr-only">Filter by time frame</label>
                <select
                  id="timeframe-select"
                  aria-label="Filter by time frame"
                  className="pl-12 pr-8 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md appearance-none min-w-[160px]"
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
                >
                  <option value="all">All Time</option>
                  <option value="month">This Month</option>
                  <option value="week">This Week</option>
                  <option value="today">Today</option>
                </select>
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === 'table' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowUpDown className="h-4 w-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === 'card' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Star className="h-4 w-4" />
                Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mb-4 animate-pulse">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Leaderboard</h3>
            <p className="text-gray-600">Fetching the latest rankings...</p>
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Leaderboard</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Zap className="h-5 w-5" />
            Try Again
          </button>
        </div>
      ) : (
        <>
          {showTopThree && topThreeEntries.length > 0 && (
            <div className="mb-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">🏆 Top Contributors</h2>
                <p className="text-gray-600">Our community's most active members</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 p-8 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400"></div>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-yellow-100 to-transparent rounded-full opacity-20"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-blue-100 to-transparent rounded-full opacity-20"></div>
                
                <div className="flex items-end justify-center gap-8 md:gap-16 relative z-10">
                  {/* 2nd place */}
                  {topThreeEntries[1] && (
                    <div className="flex flex-col items-center group">
                      <div className="relative mb-4">
                        <div className="absolute -inset-2 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        {topThreeEntries[1].avatar_url ? (
                          <img className="h-20 w-20 rounded-full border-4 border-gray-300 shadow-xl group-hover:scale-110 transition-transform duration-300" src={topThreeEntries[1].avatar_url} alt={`Profile picture of ${topThreeEntries[1].username}`} />
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-gray-300 shadow-xl group-hover:scale-110 transition-transform duration-300">
                            <User className="h-10 w-10 text-gray-500" />
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full p-2 shadow-lg">
                          {getRankIcon(2, 'h-6 w-6', 'text-white')}
                        </div>
                      </div>
                      <div className="text-center mb-4">
                        <p className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">{topThreeEntries[1].username}</p>
                        <p className="text-sm text-gray-600 font-medium">{topThreeEntries[1].points.toLocaleString()} points</p>
                      </div>
                      <div className="w-28 h-20 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-2xl flex items-end justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <span className="mb-3 text-lg font-bold text-white">2</span>
                      </div>
                    </div>
                  )}

                  {/* 1st place */}
                  {topThreeEntries[0] && (
                    <div className="flex flex-col items-center group">
                      <div className="relative mb-4">
                        <div className="absolute -inset-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300 animate-pulse"></div>
                        {topThreeEntries[0].avatar_url ? (
                          <img className="h-24 w-24 rounded-full border-4 border-yellow-400 shadow-2xl group-hover:scale-110 transition-transform duration-300" src={topThreeEntries[0].avatar_url} alt={`Profile picture of ${topThreeEntries[0].username}`} />
                        ) : (
                          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center border-4 border-yellow-400 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                            <User className="h-12 w-12 text-yellow-600" />
                          </div>
                        )}
                        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-full p-2 shadow-xl">
                          {getRankIcon(1, 'h-7 w-7', 'text-white')}
                        </div>
                        {/* Crown effect */}
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                          <div className="w-8 h-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-t-full"></div>
                        </div>
                      </div>
                      <div className="text-center mb-4">
                        <p className="text-xl font-bold text-gray-900 group-hover:text-yellow-700 transition-colors">{topThreeEntries[0].username}</p>
                        <p className="text-base text-yellow-600 font-bold">{topThreeEntries[0].points.toLocaleString()} points</p>
                        <div className="inline-flex items-center gap-1 mt-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-yellow-600 font-medium">Champion</span>
                        </div>
                      </div>
                      <div className="w-32 h-28 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-3xl flex items-end justify-center shadow-2xl group-hover:shadow-3xl transition-shadow duration-300 relative">
                        <span className="mb-4 text-2xl font-bold text-white">1</span>
                        {/* Shine effect */}
                        <div className="absolute top-2 left-2 w-8 h-8 bg-white/20 rounded-full"></div>
                      </div>
                    </div>
                  )}

                  {/* 3rd place */}
                  {topThreeEntries[2] && (
                    <div className="flex flex-col items-center group">
                      <div className="relative mb-4">
                        <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        {topThreeEntries[2].avatar_url ? (
                          <img className="h-20 w-20 rounded-full border-4 border-amber-300 shadow-xl group-hover:scale-110 transition-transform duration-300" src={topThreeEntries[2].avatar_url} alt={`Profile picture of ${topThreeEntries[2].username}`} />
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center border-4 border-amber-300 shadow-xl group-hover:scale-110 transition-transform duration-300">
                            <User className="h-10 w-10 text-amber-600" />
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full p-2 shadow-lg">
                          {getRankIcon(3, 'h-6 w-6', 'text-white')}
                        </div>
                      </div>
                      <div className="text-center mb-4">
                        <p className="text-lg font-bold text-gray-900 group-hover:text-amber-700 transition-colors">{topThreeEntries[2].username}</p>
                        <p className="text-sm text-amber-600 font-medium">{topThreeEntries[2].points.toLocaleString()} points</p>
                      </div>
                      <div className="w-28 h-18 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-2xl flex items-end justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <span className="mb-3 text-lg font-bold text-white">3</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {timeFrame === 'all' ? 'All Time Rankings' :
                       timeFrame === 'month' ? 'This Month\'s Rankings' :
                       timeFrame === 'week' ? 'This Week\'s Rankings' :
                       'Today\'s Rankings'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {sortedAndFilteredEntries.length} contributors
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTopThree(!showTopThree)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200"
                >
                  {showTopThree ? 'Hide' : 'Show'} Top 3
                </button>
              </div>
            </div>
            
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200/50">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Contributor
                      </th>
                      <th 
                        className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors duration-200"
                        onClick={() => handleSort('points')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Points</span>
                          <ArrowUpDown className="h-4 w-4" />
                          {sortField === 'points' && (
                            <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors duration-200"
                        onClick={() => handleSort('reports_submitted')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Reports</span>
                          <ArrowUpDown className="h-4 w-4" />
                          {sortField === 'reports_submitted' && (
                            <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-8 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors duration-200"
                        onClick={() => handleSort('reports_verified')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Verified</span>
                          <ArrowUpDown className="h-4 w-4" />
                          {sortField === 'reports_verified' && (
                            <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200/50">
                    {paginatedEntries.map((entry) => (
                      <tr 
                        key={entry.id}
                        className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 cursor-pointer group transition-colors duration-200"
                        onClick={() => setSelectedUser(entry)}
                      >
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              <div className="flex items-center gap-2">
                                {getRankIcon(entries.findIndex(e => e.id === entry.id) + 1, 'h-6 w-6')}
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
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0 h-12 w-12">
                                {entry.avatar_url ? (
                                  <img
                                    className="h-12 w-12 rounded-full ring-2 ring-gray-200 group-hover:ring-blue-300 transition-all duration-200"
                                    src={entry.avatar_url}
                                    alt={`Profile picture of ${entry.username}`}
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ring-2 ring-gray-200 group-hover:ring-blue-300 transition-all duration-200">
                                    <User className="h-6 w-6 text-gray-500" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <Link
                                  to={`/profile/${entry.id}`}
                                  className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {entry.username}
                                </Link>
                                <p className="text-sm text-gray-500">Contributor</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                              {entry.points.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="text-base font-medium text-gray-700">
                              {entry.reports_submitted || 0}
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="text-base font-medium text-gray-700">
                              {(entry.reports_verified || 0) > 0 ? entry.reports_verified : '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                {paginatedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 overflow-hidden"
                    onClick={() => setSelectedUser(entry)}
                  >
                      <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex-shrink-0">
                            {entry.avatar_url ? (
                              <img
                                className="h-16 w-16 rounded-full ring-4 ring-gray-200 group-hover:ring-blue-300 transition-all duration-300"
                                src={entry.avatar_url}
                                alt={`Profile picture of ${entry.username}`}
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ring-4 ring-gray-200 group-hover:ring-blue-300 transition-all duration-300">
                                <User className="h-8 w-8 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Link
                                to={`/profile/${entry.id}`}
                                className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200"
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
                            <div className="flex items-center gap-2">
                              {getRankIcon(entries.findIndex(e => e.id === entry.id) + 1, 'h-5 w-5')}
                              <span className="text-sm text-gray-600 font-medium">#{entries.findIndex(e => e.id === entry.id) + 1}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Points</p>
                            <p className="text-2xl font-bold text-blue-700">{entry.points.toLocaleString()}</p>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center group-hover:from-purple-100 group-hover:to-purple-200 transition-all duration-300">
                            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Reports</p>
                            <p className="text-2xl font-bold text-purple-700">{entry.reports_submitted || 0}</p>
                          </div>
                          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 text-center group-hover:from-emerald-100 group-hover:to-emerald-200 transition-all duration-300">
                            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Verified</p>
                            <p className="text-2xl font-bold text-emerald-700">{(entry.reports_verified || 0) > 0 ? entry.reports_verified : '-'}</p>
                          </div>
                          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 text-center group-hover:from-amber-100 group-hover:to-amber-200 transition-all duration-300">
                            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Resolved</p>
                            <p className="text-2xl font-bold text-amber-700">{entry.reports_resolved || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Modern Pagination */}
            <div className="px-8 py-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-semibold text-gray-900">
                        {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedAndFilteredEntries.length)}
                      </span>{' '}
                      to{' '}
                      <span className="font-semibold text-gray-900">
                        {Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredEntries.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold text-gray-900">{sortedAndFilteredEntries.length}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-200 ${
                            currentPage === i + 1
                              ? 'z-10 bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500 text-white shadow-lg'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Contributor Details</h3>
                    <p className="text-sm text-gray-600">Detailed statistics and information</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-8 py-8">
              <div className="flex items-center gap-6 mb-8">
                <div className="flex-shrink-0">
                  {selectedUser.avatar_url ? (
                    <img
                      className="h-20 w-20 rounded-full ring-4 ring-gray-200 shadow-lg"
                      src={selectedUser.avatar_url}
                      alt={`Profile picture of ${selectedUser.username}`}
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ring-4 ring-gray-200 shadow-lg">
                      <User className="h-10 w-10 text-gray-500" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">{selectedUser.username}</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(entries.findIndex(e => e.id === selectedUser.id) + 1, 'h-6 w-6')}
                      <span className="text-lg font-semibold text-gray-700">Rank #{entries.findIndex(e => e.id === selectedUser.id) + 1}</span>
                    </div>
                    {getRankChange(selectedUser) && (
                      <div className="flex items-center gap-1">
                        {getRankChange(selectedUser) === 'up' ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-red-500 transform rotate-180" />
                        )}
                        <span className="text-sm text-gray-600">
                          {getRankChange(selectedUser) === 'up' ? 'Moved up' : 'Moved down'} in rankings
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl mb-4">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Total Points</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {selectedUser.points.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500 rounded-xl mb-4">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-2">Reports Submitted</p>
                  <p className="text-3xl font-bold text-purple-700">
                    {selectedUser.reports_submitted || 0}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-xl mb-4">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-2">Reports Verified</p>
                  <p className="text-3xl font-bold text-emerald-700">
                    {selectedUser.reports_verified || 0}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500 rounded-xl mb-4">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-2">Reports Resolved</p>
                  <p className="text-3xl font-bold text-amber-700">
                    {selectedUser.reports_resolved || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white">
              <Link
                to={`/profile/${selectedUser.id}`}
                className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
              >
                <User className="h-5 w-5" />
                View Full Profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 