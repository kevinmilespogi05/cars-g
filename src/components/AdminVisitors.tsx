import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Eye, 
  User, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Calendar,
  Filter,
  Download,
  Globe,
  UserCheck,
  UserX
} from 'lucide-react';
import { getVisitors, getVisitorStats, Visitor, VisitorStats } from '../services/visitorMonitoringService';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { isAuthenticated as isJWTAuthenticated } from '../lib/jwt';

export function AdminVisitors() {
  const { isAuthenticated, user } = useAuthStore();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'anonymous' | 'authenticated'>('all');
  const [sortBy, setSortBy] = useState<'first_visit_at' | 'last_visit_at' | 'visit_count' | 'created_at'>('last_visit_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI state
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (isAuthenticated && (isJWTAuthenticated() || user)) {
      fetchStats();
      fetchVisitors();
    } else {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [page, typeFilter, sortBy, sortOrder, searchTerm, isAuthenticated, user]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setTypeDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const statsData = await getVisitorStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching visitor stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const response = await getVisitors({
        page,
        limit,
        type: typeFilter,
        sortBy,
        sortOrder,
        search: searchTerm
      });
      
      setVisitors(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const handleTypeFilter = (type: 'all' | 'anonymous' | 'authenticated') => {
    setTypeFilter(type);
    setPage(1);
    setTypeDropdownOpen(false);
  };

  const handleSort = (field: 'first_visit_at' | 'last_visit_at' | 'visit_count' | 'created_at') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setSortDropdownOpen(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const truncateVisitorId = (id: string) => {
    return id.length > 20 ? `${id.substring(0, 20)}...` : id;
  };

  const exportToCSV = () => {
    const headers = ['Visitor ID', 'User', 'First Visit', 'Last Visit', 'Visit Count', 'User Agent', 'Status'];
    const rows = visitors.map(v => [
      v.visitor_id,
      v.profiles ? `${v.profiles.username} (${v.profiles.email})` : 'Anonymous',
      formatDate(v.first_visit_at),
      formatDate(v.last_visit_at),
      v.visit_count.toString(),
      v.user_agent || 'N/A',
      v.user_id ? 'Authenticated' : 'Anonymous'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `visitors_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Visitors</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? '...' : stats?.totalVisitors.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Globe className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Anonymous</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? '...' : stats?.anonymousVisitors.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <UserX className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Authenticated</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? '...' : stats?.authenticatedVisitors.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? '...' : stats?.newVisitorsThisMonth.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by visitor ID or user agent..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <div className="relative" ref={typeDropdownRef}>
            <button
              onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">
                {typeFilter === 'all' ? 'All Visitors' : typeFilter === 'anonymous' ? 'Anonymous' : 'Authenticated'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {typeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleTypeFilter('all')}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${typeFilter === 'all' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                >
                  All Visitors
                </button>
                <button
                  onClick={() => handleTypeFilter('anonymous')}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${typeFilter === 'anonymous' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                >
                  Anonymous
                </button>
                <button
                  onClick={() => handleTypeFilter('authenticated')}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${typeFilter === 'authenticated' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                >
                  Authenticated
                </button>
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">
                Sort: {sortBy === 'last_visit_at' ? 'Last Visit' : sortBy === 'first_visit_at' ? 'First Visit' : sortBy === 'visit_count' ? 'Visit Count' : 'Created'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {sortDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleSort('last_visit_at')}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'last_visit_at' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                >
                  Last Visit {sortBy === 'last_visit_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('first_visit_at')}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'first_visit_at' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                >
                  First Visit {sortBy === 'first_visit_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('visit_count')}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${sortBy === 'visit_count' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                >
                  Visit Count {sortBy === 'visit_count' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={() => {
              fetchStats();
              fetchVisitors();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Refresh</span>
          </button>

          {/* Export */}
          <button
            onClick={exportToCSV}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export</span>
          </button>
        </div>
      </div>

      {/* Visitors Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Visitor ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  First Visit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Last Visit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Visits
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  User Agent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading visitors...
                    </div>
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No visitors found
                  </td>
                </tr>
              ) : (
                visitors.map((visitor) => (
                  <tr key={visitor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      {truncateVisitorId(visitor.visitor_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {visitor.profiles ? (
                        <div>
                          <div className="font-medium">{visitor.profiles.username}</div>
                          <div className="text-xs text-gray-500">{visitor.profiles.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{formatDate(visitor.first_visit_at)}</div>
                      <div className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(visitor.first_visit_at), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{formatDate(visitor.last_visit_at)}</div>
                      <div className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(visitor.last_visit_at), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {visitor.visit_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {truncateText(visitor.user_agent || 'N/A', 50)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {visitor.user_id ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Authenticated
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <UserX className="w-3 h-3 mr-1" />
                          Anonymous
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && visitors.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} visitors
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

