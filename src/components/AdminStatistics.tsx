import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, Calendar, Clock, User, AlertTriangle, Download, Filter } from 'lucide-react';
import { Notification } from './Notification';

interface Statistics {
  totalReports: number;
  pendingReports: number;
  inProgressReports: number;
  resolvedReports: number;
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  reportsByCategory: Array<{ category: string; count: number }>;
  reportsByLocation: Array<{ location: string; count: number }>;
  reportsByTime: Array<{ hour: number; count: number }>;
  reportsByDay: Array<{ day: string; count: number }>;
  reportsByMonth: Array<{ month: string; count: number }>;
  averageResolutionTime: number;
  fastestResolutionTime: number;
  slowestResolutionTime: number;
  previousStats?: {
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    totalUsers: number;
  };
}

export function AdminStatistics() {
  const { user: currentUser } = useAuthStore();
  const [statistics, setStatistics] = useState<Statistics>({
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
    totalUsers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    reportsByCategory: [],
    reportsByLocation: [],
    reportsByTime: [],
    reportsByDay: [],
    reportsByMonth: [],
    averageResolutionTime: 0,
    fastestResolutionTime: 0,
    slowestResolutionTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week');

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchStatistics();
    }
  }, [timeRange, currentUser?.role]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // Calculate date range based on selected time range
      const now = new Date();
      let startDate = new Date();
      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch reports data with date filter
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (reportsError) throw reportsError;

      // Fetch users data
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;

      // Calculate basic statistics
      const totalReports = reports?.length || 0;
      const pendingReports = reports?.filter(r => r.status === 'pending').length || 0;
      const inProgressReports = reports?.filter(r => r.status === 'in_progress').length || 0;
      const resolvedReports = reports?.filter(r => r.status === 'resolved').length || 0;
      const totalUsers = users?.length || 0;
      const activeUsers = users?.filter(u => !u.is_banned).length || 0;
      const bannedUsers = users?.filter(u => u.is_banned).length || 0;

      // Calculate reports by category
      const reportsByCategory = (reports || []).reduce((acc, report) => {
        const existing = acc.find(item => item.category === report.category);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ category: report.category, count: 1 });
        }
        return acc;
      }, [] as Array<{ category: string; count: number }>);

      // Calculate reports by location
      const reportsByLocation = (reports || []).reduce((acc, report) => {
        const existing = acc.find(item => item.location === report.location_address);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ location: report.location_address, count: 1 });
        }
        return acc;
      }, [] as Array<{ location: string; count: number }>);

      // Calculate reports by time of day
      const reportsByTime = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: (reports || []).filter(r => new Date(r.created_at).getHours() === hour).length,
      }));

      // Calculate reports by day of week
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const reportsByDay = days.map(day => ({
        day,
        count: (reports || []).filter(r => days[new Date(r.created_at).getDay()] === day).length,
      }));

      // Calculate reports by month
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const reportsByMonth = months.map(month => ({
        month,
        count: (reports || []).filter(r => months[new Date(r.created_at).getMonth()] === month).length,
      }));

      // Calculate resolution times
      const resolvedReportsWithTimes = (reports || []).filter(r => r.status === 'resolved' && r.created_at && r.updated_at);
      const resolutionTimes = resolvedReportsWithTimes.map(report => {
        const created = new Date(report.created_at).getTime();
        const updated = new Date(report.updated_at).getTime();
        return updated - created;
      });
      const totalResolutionTime = resolutionTimes.reduce((acc, time) => acc + time, 0);
      const averageResolutionTime = resolutionTimes.length > 0 ? totalResolutionTime / resolutionTimes.length : 0;
      const fastestResolutionTime = resolutionTimes.length > 0 ? Math.min(...resolutionTimes) : 0;
      const slowestResolutionTime = resolutionTimes.length > 0 ? Math.max(...resolutionTimes) : 0;

      // Store previous stats for trend calculation
      const previousStats = {
        totalReports: statistics.totalReports,
        pendingReports: statistics.pendingReports,
        resolvedReports: statistics.resolvedReports,
        totalUsers: statistics.totalUsers,
      };

      setStatistics({
        totalReports,
        pendingReports,
        inProgressReports,
        resolvedReports,
        totalUsers,
        activeUsers,
        bannedUsers,
        reportsByCategory,
        reportsByLocation,
        reportsByTime,
        reportsByDay,
        reportsByMonth,
        averageResolutionTime,
        fastestResolutionTime,
        slowestResolutionTime,
        previousStats,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setNotification({
        message: 'Failed to load statistics. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { direction: 'up', percentage: 100 };
    const percentage = ((current - previous) / previous) * 100;
    return {
      direction: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral',
      percentage: Math.abs(Math.round(percentage)),
    };
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const exportStatistics = () => {
    // Prepare data for CSV
    const csvData = [
      // Headers
      ['Metric', 'Value', 'Time Range'],
      
      // Basic Stats
      ['Total Reports', statistics.totalReports, timeRange],
      ['Pending Reports', statistics.pendingReports, timeRange],
      ['In Progress Reports', statistics.inProgressReports, timeRange],
      ['Resolved Reports', statistics.resolvedReports, timeRange],
      ['Total Users', statistics.totalUsers, timeRange],
      ['Active Users', statistics.activeUsers, timeRange],
      ['Banned Users', statistics.bannedUsers, timeRange],
      
      // Resolution Times
      ['Average Resolution Time (ms)', statistics.averageResolutionTime, timeRange],
      ['Fastest Resolution Time (ms)', statistics.fastestResolutionTime, timeRange],
      ['Slowest Resolution Time (ms)', statistics.slowestResolutionTime, timeRange],
      
      // Empty row as separator
      [],
      
      // Reports by Category
      ['Category', 'Count', 'Percentage'],
      ...statistics.reportsByCategory.map(item => [
        item.category,
        item.count,
        ((item.count / statistics.totalReports) * 100).toFixed(1) + '%'
      ]),
      
      // Empty row as separator
      [],
      
      // Reports by Location
      ['Location', 'Count', 'Percentage'],
      ...statistics.reportsByLocation.map(item => [
        item.location,
        item.count,
        ((item.count / statistics.totalReports) * 100).toFixed(1) + '%'
      ]),
      
      // Empty row as separator
      [],
      
      // Reports by Time
      ['Hour', 'Count'],
      ...statistics.reportsByTime.map(item => [
        item.hour.toString().padStart(2, '0') + ':00',
        item.count
      ]),
      
      // Empty row as separator
      [],
      
      // Reports by Day
      ['Day', 'Count'],
      ...statistics.reportsByDay.map(item => [
        item.day,
        item.count
      ]),
      
      // Empty row as separator
      [],
      
      // Reports by Month
      ['Month', 'Count'],
      ...statistics.reportsByMonth.map(item => [
        item.month,
        item.count
      ])
    ];

    // Convert array to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => {
        // Handle cells that might contain commas by wrapping in quotes
        if (cell && cell.toString().includes(',')) {
          return `"${cell}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');

    // Create and download the file
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (currentUser?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-3 py-4 sm:px-6 sm:py-5">
          {/* Mobile Header */}
          <div className="sm:hidden mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-3">Statistics Dashboard</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month' | 'year')}
                  className="flex-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm rounded-md"
                >
                  <option value="day">Last 24 Hours</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Last 12 Months</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={fetchStatistics}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={exportStatistics}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden sm:flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Statistics Dashboard</h3>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month' | 'year')}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="day">Last 24 Hours</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Last 12 Months</option>
                </select>
              </div>
              <button
                onClick={fetchStatistics}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportStatistics}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Key Metrics */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-md bg-blue-500 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Reports</dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">{statistics.totalReports}</dd>
                      {statistics.previousStats && (
                        <div className="flex items-center mt-1">
                          {getTrendIcon(calculateTrend(statistics.totalReports, statistics.previousStats.totalReports).direction)}
                          <span className="ml-1 text-xs text-gray-500">
                            {calculateTrend(statistics.totalReports, statistics.previousStats.totalReports).percentage}%
                          </span>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-md bg-yellow-500 flex items-center justify-center">
                      <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Pending Reports</dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">{statistics.pendingReports}</dd>
                      {statistics.previousStats && (
                        <div className="flex items-center mt-1">
                          {getTrendIcon(calculateTrend(statistics.pendingReports, statistics.previousStats.pendingReports).direction)}
                          <span className="ml-1 text-xs text-gray-500">
                            {calculateTrend(statistics.pendingReports, statistics.previousStats.pendingReports).percentage}%
                          </span>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-md bg-green-500 flex items-center justify-center">
                      <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Resolved Reports</dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">{statistics.resolvedReports}</dd>
                      {statistics.previousStats && (
                        <div className="flex items-center mt-1">
                          {getTrendIcon(calculateTrend(statistics.resolvedReports, statistics.previousStats.resolvedReports).direction)}
                          <span className="ml-1 text-xs text-gray-500">
                            {calculateTrend(statistics.resolvedReports, statistics.previousStats.resolvedReports).percentage}%
                          </span>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-md bg-purple-500 flex items-center justify-center">
                      <User className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-base sm:text-lg font-medium text-gray-900">{statistics.totalUsers}</dd>
                      {statistics.previousStats && (
                        <div className="flex items-center mt-1">
                          {getTrendIcon(calculateTrend(statistics.totalUsers, statistics.previousStats.totalUsers).direction)}
                          <span className="ml-1 text-xs text-gray-500">
                            {calculateTrend(statistics.totalUsers, statistics.previousStats.totalUsers).percentage}%
                          </span>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resolution Time Metrics */}
          <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <h4 className="text-base sm:text-lg font-medium text-gray-900">Average Resolution Time</h4>
                <p className="mt-2 text-2xl sm:text-3xl font-semibold text-gray-900">
                  {formatTime(statistics.averageResolutionTime)}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Average time taken to resolve reports
                </p>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <h4 className="text-base sm:text-lg font-medium text-gray-900">Fastest Resolution</h4>
                <p className="mt-2 text-2xl sm:text-3xl font-semibold text-gray-900">
                  {formatTime(statistics.fastestResolutionTime)}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Quickest report resolution
                </p>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <h4 className="text-base sm:text-lg font-medium text-gray-900">Slowest Resolution</h4>
                <p className="mt-2 text-2xl sm:text-3xl font-semibold text-gray-900">
                  {formatTime(statistics.slowestResolutionTime)}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Longest report resolution
                </p>
              </div>
            </div>
          </div>

          {/* User Activity */}
          <div className="mt-6 sm:mt-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <h4 className="text-base sm:text-lg font-medium text-gray-900">User Activity</h4>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Active Users</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">{statistics.activeUsers}</p>
                    <p className="text-xs text-gray-500">
                      {((statistics.activeUsers / statistics.totalUsers) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Banned Users</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">{statistics.bannedUsers}</p>
                    <p className="text-xs text-gray-500">
                      {((statistics.bannedUsers / statistics.totalUsers) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Reports per User</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                      {statistics.totalUsers > 0 ? (statistics.totalReports / statistics.totalUsers).toFixed(1) : 0}
                    </p>
                    <p className="text-xs text-gray-500">
                      Average reports per user
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reports by Category */}
          <div className="mt-6 sm:mt-8">
            <h4 className="text-base sm:text-lg font-medium text-gray-900">Reports by Category</h4>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {statistics.reportsByCategory.map((item) => (
                <div key={item.category} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-500">{item.category}</p>
                        <p className="text-base sm:text-lg font-medium text-gray-900">{item.count}</p>
                        <p className="text-xs text-gray-500">
                          {((item.count / statistics.totalReports) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reports by Location */}
          <div className="mt-6 sm:mt-8">
            <h4 className="text-base sm:text-lg font-medium text-gray-900">Reports by Location</h4>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {statistics.reportsByLocation.map((item) => (
                <div key={item.location} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{item.location}</p>
                        <p className="text-base sm:text-lg font-medium text-gray-900">{item.count}</p>
                        <p className="text-xs text-gray-500">
                          {((item.count / statistics.totalReports) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time-based Statistics */}
          <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <h4 className="text-base sm:text-lg font-medium text-gray-900">Reports by Time of Day</h4>
                <div className="mt-4">
                  {statistics.reportsByTime.map((item) => (
                    <div key={item.hour} className="flex items-center justify-between py-2">
                      <span className="text-xs sm:text-sm text-gray-500">
                        {item.hour.toString().padStart(2, '0')}:00
                      </span>
                      <div className="flex items-center">
                        <div className="w-20 sm:w-32 bg-gray-200 rounded-full h-2 sm:h-2.5">
                          <div
                            className="bg-blue-500 h-2 sm:h-2.5 rounded-full"
                            style={{ width: `${(item.count / Math.max(...statistics.reportsByTime.map(r => r.count))) * 100}%` }}
                          />
                        </div>
                        <span className="ml-2 text-xs sm:text-sm text-gray-500">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <h4 className="text-base sm:text-lg font-medium text-gray-900">Reports by Day of Week</h4>
                <div className="mt-4">
                  {statistics.reportsByDay.map((item) => (
                    <div key={item.day} className="flex items-center justify-between py-2">
                      <span className="text-xs sm:text-sm text-gray-500">{item.day}</span>
                      <div className="flex items-center">
                        <div className="w-20 sm:w-32 bg-gray-200 rounded-full h-2 sm:h-2.5">
                          <div
                            className="bg-green-500 h-2 sm:h-2.5 rounded-full"
                            style={{ width: `${(item.count / Math.max(...statistics.reportsByDay.map(r => r.count))) * 100}%` }}
                          />
                        </div>
                        <span className="ml-2 text-xs sm:text-sm text-gray-500">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Statistics */}
          <div className="mt-6 sm:mt-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <h4 className="text-base sm:text-lg font-medium text-gray-900">Reports by Month</h4>
                <div className="mt-4">
                  {statistics.reportsByMonth.map((item) => (
                    <div key={item.month} className="flex items-center justify-between py-2">
                      <span className="text-xs sm:text-sm text-gray-500">{item.month}</span>
                      <div className="flex items-center">
                        <div className="w-20 sm:w-32 bg-gray-200 rounded-full h-2 sm:h-2.5">
                          <div
                            className="bg-purple-500 h-2 sm:h-2.5 rounded-full"
                            style={{ width: `${(item.count / Math.max(...statistics.reportsByMonth.map(r => r.count))) * 100}%` }}
                          />
                        </div>
                        <span className="ml-2 text-xs sm:text-sm text-gray-500">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
} 