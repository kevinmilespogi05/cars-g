import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useVisitCounter } from '../hooks/useVisitCounter';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  Users, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Filter,
  Globe
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { getStatusColor as badgeStatusColor, formatStatusForDisplay } from '../lib/badges';
import type { Report } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type TimeRange = '7days' | '30days' | '3months' | '1year' | 'all';

interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  totalUsers: number;
  activeIssuesThisWeek: number;
  previousTotalReports: number;
  previousPendingReports: number;
  previousResolvedReports: number;
  previousTotalUsers: number;
  reportsByStatus: Array<{ status: string; count: number }>;
  reportsByCategory: Array<{ category: string; count: number }>;
  activeUsers: number;
  bannedUsers: number;
  reportsByTime: Array<{ hour: number; count: number }>;
  reportsByDay: Array<{ day: string; count: number }>;
  reportsByMonth: Array<{ month: string; count: number }>;
  recentReports: Report[];
  uniqueVisitors: number;
}

export function AdminDashboardOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const { count: uniqueVisitorsCount, loading: loadingVisitors } = useVisitCounter({ autoTrack: false });
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    totalUsers: 0,
    activeIssuesThisWeek: 0,
    previousTotalReports: 0,
    previousPendingReports: 0,
    previousResolvedReports: 0,
    previousTotalUsers: 0,
    reportsByStatus: [],
    reportsByCategory: [],
    activeUsers: 0,
    bannedUsers: 0,
    reportsByTime: [],
    reportsByDay: [],
    reportsByMonth: [],
    recentReports: [],
    uniqueVisitors: 0
  });

  const calculateDateRange = (range: TimeRange): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case '7days':
        start.setDate(end.getDate() - 7);
        break;
      case '30days':
        start.setDate(end.getDate() - 30);
        break;
      case '3months':
        start.setMonth(end.getMonth() - 3);
        break;
      case '1year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'all':
        start.setFullYear(2020); // Start from a reasonable date
        break;
    }
    
    return { start, end };
  };

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const { start, end } = calculateDateRange(timeRange);
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      // Fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('is_archived', false)
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch user profiles separately if needed
      if (reportsData && reportsData.length > 0) {
        const userIds = [...new Set(reportsData.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        // Create a map of profiles
        const profilesMap = new Map();
        (profilesData || []).forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });

        // Attach profiles to reports
        reportsData.forEach((report: any) => {
          report.user_profile = profilesMap.get(report.user_id) || null;
        });
      }

      // Fetch previous period for comparison
      const previousStart = new Date(start);
      const previousEnd = new Date(start);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      previousStart.setDate(previousStart.getDate() - daysDiff);
      const previousStartISO = previousStart.toISOString();
      const previousEndISO = previousEnd.toISOString();

      const { data: previousReportsData } = await supabase
        .from('reports')
        .select('*')
        .eq('is_archived', false)
        .gte('created_at', previousStartISO)
        .lte('created_at', previousEndISO);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, is_banned');

      if (usersError) throw usersError;

      // Calculate active issues this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const activeIssues = (reportsData || []).filter(r => {
        const createdAt = new Date(r.created_at);
        return createdAt >= weekAgo && 
               (r.status === 'pending' || r.status === 'in_progress' || r.status === 'awaiting_verification');
      }).length;

      // Process reports by status
      const statusCounts = (reportsData || []).reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const reportsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));

      // Process reports by category
      const categoryCounts = (reportsData || []).reduce((acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const reportsByCategory = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Process reports by time of day
      const timeCounts = new Array(24).fill(0);
      (reportsData || []).forEach(r => {
        const hour = new Date(r.created_at).getHours();
        timeCounts[hour]++;
      });
      const reportsByTime = timeCounts.map((count, hour) => ({ hour, count }));

      // Process reports by day of week
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayCounts = new Array(7).fill(0);
      (reportsData || []).forEach(r => {
        const day = new Date(r.created_at).getDay();
        dayCounts[day]++;
      });
      const reportsByDay = dayCounts.map((count, day) => ({ day: dayNames[day], count }));

      // Process reports by month
      const monthCounts = new Map<string, number>();
      (reportsData || []).forEach(r => {
        const date = new Date(r.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
      });
      const reportsByMonth = Array.from(monthCounts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      // Get recent reports (last 5)
      const recentReports = (reportsData || []).slice(0, 5);

      // Calculate user stats
      const activeUsers = (usersData || []).filter(u => !u.is_banned).length;
      const bannedUsers = (usersData || []).filter(u => u.is_banned).length;

      // Calculate previous period stats
      const previousTotalReports = previousReportsData?.length || 0;
      const previousPendingReports = (previousReportsData || []).filter(r => r.status === 'pending').length;
      const previousResolvedReports = (previousReportsData || []).filter(r => r.status === 'resolved').length;
      const previousTotalUsers = usersData?.length || 0;

      setStats({
        totalReports: reportsData?.length || 0,
        pendingReports: (reportsData || []).filter(r => r.status === 'pending').length,
        resolvedReports: (reportsData || []).filter(r => r.status === 'resolved').length,
        totalUsers: usersData?.length || 0,
        activeIssuesThisWeek: activeIssues,
        previousTotalReports,
        previousPendingReports,
        previousResolvedReports,
        previousTotalUsers,
        reportsByStatus,
        reportsByCategory,
        activeUsers,
        bannedUsers,
        reportsByTime,
        reportsByDay,
        reportsByMonth,
        recentReports,
        uniqueVisitors: uniqueVisitorsCount
      });

      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const calculatePercentageChange = (current: number, previous: number): { value: number; trend: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) {
      return { value: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'neutral' };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  const kpiCards = useMemo(() => {
    const totalChange = calculatePercentageChange(stats.totalReports, stats.previousTotalReports);
    const pendingChange = calculatePercentageChange(stats.pendingReports, stats.previousPendingReports);
    const resolvedChange = calculatePercentageChange(stats.resolvedReports, stats.previousResolvedReports);
    const usersChange = calculatePercentageChange(stats.totalUsers, stats.previousTotalUsers);

    return [
      {
        title: 'Unique Visitors',
        value: loadingVisitors ? 0 : stats.uniqueVisitors,
        change: { value: 0, trend: 'neutral' as const },
        icon: Globe,
        color: 'indigo',
        link: '/admin'
      },
      {
        title: 'Total Reports',
        value: stats.totalReports,
        change: totalChange,
        icon: FileText,
        color: 'blue',
        link: '/admin?section=reports'
      },
      {
        title: 'Pending Reports',
        value: stats.pendingReports,
        change: pendingChange,
        icon: Clock,
        color: 'yellow',
        link: '/admin?section=reports&status=pending'
      },
      {
        title: 'Resolved Reports',
        value: stats.resolvedReports,
        change: resolvedChange,
        icon: CheckCircle2,
        color: 'green',
        link: '/admin?section=reports&status=resolved'
      },
      {
        title: 'Total Users',
        value: stats.totalUsers,
        change: usersChange,
        icon: Users,
        color: 'purple',
        link: '/admin?section=users'
      },
      {
        title: 'Active Issues This Week',
        value: stats.activeIssuesThisWeek,
        change: { value: 0, trend: 'neutral' as const },
        icon: AlertTriangle,
        color: 'red',
        link: '/admin?section=reports'
      }
    ];
  }, [stats, loadingVisitors, uniqueVisitorsCount]);

  // Chart data
  const statusChartData = useMemo(() => {
    const statusColors: Record<string, string> = {
      verifying: '#a855f7',
      awaiting_verification: '#f97316',
      pending: '#eab308',
      in_progress: '#3b82f6',
      resolved: '#10b981',
      declined: '#ef4444',
      cancelled: '#6b7280'
    };

    return {
      labels: stats.reportsByStatus.map(s => formatStatusForDisplay(s.status)),
      datasets: [{
        data: stats.reportsByStatus.map(s => s.count),
        backgroundColor: stats.reportsByStatus.map(s => statusColors[s.status] || '#6b7280'),
        borderColor: stats.reportsByStatus.map(s => statusColors[s.status] || '#6b7280'),
        borderWidth: 2
      }]
    };
  }, [stats.reportsByStatus]);

  const categoryChartData = useMemo(() => ({
    labels: stats.reportsByCategory.map(c => c.category),
    datasets: [{
      label: 'Reports',
      data: stats.reportsByCategory.map(c => c.count),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: '#3b82f6',
      borderWidth: 2,
      borderRadius: 4
    }]
  }), [stats.reportsByCategory]);

  const userActivityData = useMemo(() => ({
    labels: ['Active Users', 'Banned Users'],
    datasets: [{
      data: [stats.activeUsers, stats.bannedUsers],
      backgroundColor: ['#10b981', '#ef4444'],
      borderColor: ['#059669', '#dc2626'],
      borderWidth: 2
    }]
  }), [stats.activeUsers, stats.bannedUsers]);

  const timeOfDayData = useMemo(() => ({
    labels: stats.reportsByTime.map(t => `${String(t.hour).padStart(2, '0')}:00`),
    datasets: [{
      label: 'Reports',
      data: stats.reportsByTime.map(t => t.count),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }), [stats.reportsByTime]);

  const dayOfWeekData = useMemo(() => ({
    labels: stats.reportsByDay.map(d => d.day),
    datasets: [{
      label: 'Reports',
      data: stats.reportsByDay.map(d => d.count),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: '#3b82f6',
      borderWidth: 2,
      borderRadius: 4
    }]
  }), [stats.reportsByDay]);

  const monthlyTrendData = useMemo(() => ({
    labels: stats.reportsByMonth.map(m => {
      const [year, month] = m.month.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }),
    datasets: [{
      label: 'Reports',
      data: stats.reportsByMonth.map(m => m.count),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      fill: true,
      tension: 0.4
    }]
  }), [stats.reportsByMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm text-gray-600 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="3months">Last 3 Months</option>
              <option value="1year">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600',
            yellow: 'bg-yellow-100 text-yellow-600',
            green: 'bg-green-100 text-green-600',
            purple: 'bg-purple-100 text-purple-600',
            red: 'bg-red-100 text-red-600'
          };
          const TrendIcon = card.change.trend === 'up' ? TrendingUp : card.change.trend === 'down' ? TrendingDown : Minus;
          const trendColor = card.change.trend === 'up' ? 'text-green-600' : card.change.trend === 'down' ? 'text-red-600' : 'text-gray-600';

          return (
            <button
              key={card.title}
              onClick={() => navigate(card.link)}
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {card.change.value > 0 && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                    <TrendIcon className="w-3 h-3" />
                    {card.change.value.toFixed(1)}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{card.value.toLocaleString()}</div>
              <div className="text-sm text-gray-600">{card.title}</div>
            </button>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Reports Status Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reports Status Overview</h3>
            {stats.reportsByStatus.length > 0 ? (
              <div className="h-64">
                <Doughnut
                  data={statusChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 15,
                          usePointStyle: true
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Reports by Category */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reports by Category</h3>
            {stats.reportsByCategory.length > 0 ? (
              <div className="h-64">
                <Bar
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* User Activity Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">User Activity Status</h3>
              <button
                onClick={() => navigate('/admin?section=users')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage Users →
              </button>
            </div>
            {stats.activeUsers + stats.bannedUsers > 0 ? (
              <div className="h-64">
                <Pie
                  data={userActivityData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 15,
                          usePointStyle: true
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Latest 5 Reports</h3>
              <button
                onClick={() => navigate('/admin?section=reports')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </button>
            </div>
            {stats.recentReports.length > 0 ? (
              <div className="space-y-3">
                {stats.recentReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => navigate(`/reports/${report.id}`)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {report.case_number && (
                            <span className="text-xs font-medium text-gray-500">#{report.case_number}</span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeStatusColor(report.status)}`}>
                            {formatStatusForDisplay(report.status)}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                          {report.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(report.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent reports
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time-Based Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports by Time of Day */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reporting Activity by Time of Day</h3>
          {stats.reportsByTime.some(t => t.count > 0) ? (
            <div className="h-64">
              <Line
                data={timeOfDayData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Reports by Day of Week */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Report Distribution</h3>
          {stats.reportsByDay.some(d => d.count > 0) ? (
            <div className="h-64">
              <Bar
                data={dayOfWeekData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Monthly Reports Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Reports Trend</h3>
          {stats.reportsByMonth.length > 0 ? (
            <div className="h-64">
              <Line
                data={monthlyTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

