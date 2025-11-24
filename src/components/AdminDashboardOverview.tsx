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
  Globe,
  ArrowRight,
  Calendar,
  MoreHorizontal
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

// --- Internal Components ---

const DashboardCard = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  onClick,
  footer
}: {
  title: string;
  value: string | number;
  change?: { value: number; trend: 'up' | 'down' | 'neutral' };
  icon: any;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'indigo';
  onClick?: () => void;
  footer?: React.ReactNode;
}) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    green: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    yellow: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    red: 'bg-red-50 text-red-600 group-hover:bg-red-100',
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
  };

  const TrendIcon = change?.trend === 'up' ? TrendingUp : change?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = change?.trend === 'up' ? 'text-emerald-600' : change?.trend === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl transition-colors duration-300 ${colorStyles[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {(change || footer) && (
        <div className="flex items-center justify-between pt-2">
          {change && (
            <div className={`flex items-center gap-1.5 text-sm font-medium ${trendColor} bg-gray-50 px-2 py-1 rounded-lg`}>
              <TrendIcon className="w-4 h-4" />
              <span>{change.value.toFixed(1)}%</span>
              <span className="text-gray-400 font-normal ml-1">vs last period</span>
            </div>
          )}
          {footer}
        </div>
      )}
    </div>
  );
};

const ChartCard = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-300 h-full flex flex-col">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      {action}
    </div>
    <div className="flex-1 min-h-[300px] relative w-full">
      {children}
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
    <div className="flex justify-between mb-4">
      <div className="space-y-3">
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        <div className="h-8 w-16 bg-gray-200 rounded"></div>
      </div>
      <div className="h-12 w-12 bg-gray-200 rounded-xl"></div>
    </div>
    <div className="h-6 w-32 bg-gray-200 rounded"></div>
  </div>
);

// --- Main Component ---

export function AdminDashboardOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const { count: uniqueVisitorsCount, loading: loadingVisitors } = useVisitCounter({ autoTrack: false });
  const [visitorStats, setVisitorStats] = useState<{ anonymous: number; authenticated: number } | null>(null);
  const [showVisitorBreakdown, setShowVisitorBreakdown] = useState(false);

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
      case '7days': start.setDate(end.getDate() - 7); break;
      case '30days': start.setDate(end.getDate() - 30); break;
      case '3months': start.setMonth(end.getMonth() - 3); break;
      case '1year': start.setFullYear(end.getFullYear() - 1); break;
      case 'all': start.setFullYear(2020); break;
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

      // Fetch user profiles for reports
      if (reportsData && reportsData.length > 0) {
        const userIds = [...new Set(reportsData.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map();
        (profilesData || []).forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });

        reportsData.forEach((report: any) => {
          report.user_profile = profilesMap.get(report.user_id) || null;
        });
      }

      // Fetch previous period for comparison
      const previousStart = new Date(start);
      const previousEnd = new Date(start);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      previousStart.setDate(previousStart.getDate() - daysDiff);

      const { data: previousReportsData } = await supabase
        .from('reports')
        .select('*')
        .eq('is_archived', false)
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString());

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, is_banned');

      if (usersError) throw usersError;

      // Calculate stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const activeIssues = (reportsData || []).filter(r => {
        const createdAt = new Date(r.created_at);
        return createdAt >= weekAgo &&
          ['pending', 'in_progress', 'awaiting_verification'].includes(r.status);
      }).length;

      // Process aggregations
      const statusCounts = (reportsData || []).reduce((acc: any, r: any) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});

      const categoryCounts = (reportsData || []).reduce((acc: any, r: any) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
      }, {});

      // Time aggregations
      const timeCounts = new Array(24).fill(0);
      const dayCounts = new Array(7).fill(0);
      const monthCounts = new Map<string, number>();

      (reportsData || []).forEach((r: any) => {
        const date = new Date(r.created_at);
        timeCounts[date.getHours()]++;
        dayCounts[date.getDay()]++;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
      });

      setStats(prev => ({
        totalReports: reportsData?.length || 0,
        pendingReports: (reportsData || []).filter(r => r.status === 'pending').length,
        resolvedReports: (reportsData || []).filter(r => r.status === 'resolved').length,
        totalUsers: usersData?.length || 0,
        activeIssuesThisWeek: activeIssues,
        previousTotalReports: previousReportsData?.length || 0,
        previousPendingReports: (previousReportsData || []).filter(r => r.status === 'pending').length,
        previousResolvedReports: (previousReportsData || []).filter(r => r.status === 'resolved').length,
        previousTotalUsers: usersData?.length || 0,
        reportsByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count: count as number })),
        reportsByCategory: Object.entries(categoryCounts)
          .map(([category, count]) => ({ category, count: count as number }))
          .sort((a, b) => b.count - a.count),
        activeUsers: (usersData || []).filter(u => !u.is_banned).length,
        bannedUsers: (usersData || []).filter(u => u.is_banned).length,
        reportsByTime: timeCounts.map((count, hour) => ({ hour, count })),
        reportsByDay: dayCounts.map((count, day) => ({ day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day], count })),
        reportsByMonth: Array.from(monthCounts.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, count]) => ({ month, count })),
        recentReports: (reportsData || []).slice(0, 5),
        uniqueVisitors: !loadingVisitors ? uniqueVisitorsCount : prev.uniqueVisitors
      }));

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  useEffect(() => {
    if (!loadingVisitors && uniqueVisitorsCount !== stats.uniqueVisitors) {
      setStats(prev => ({ ...prev, uniqueVisitors: uniqueVisitorsCount }));
    }
  }, [uniqueVisitorsCount, loadingVisitors]);

  useEffect(() => {
    const fetchVisitorStats = async () => {
      try {
        const { getVisitorStats } = await import('../services/visitCounterService');
        const stats = await getVisitorStats();
        setVisitorStats({
          anonymous: stats.anonymousVisitors,
          authenticated: stats.authenticatedVisitors
        });
      } catch (error) {
        console.error('Error fetching visitor stats:', error);
      }
    };
    fetchVisitorStats();
  }, []);

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'neutral' as const };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' as const
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { family: "'Inter', sans-serif", size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleFont: { family: "'Inter', sans-serif", size: 13 },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif" } } },
      y: { border: { display: false }, grid: { color: '#f3f4f6' }, ticks: { font: { family: "'Inter', sans-serif" } } }
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-gray-200 rounded-2xl animate-pulse"></div>
          <div className="h-96 bg-gray-200 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Filter className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="w-full sm:w-48 pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer hover:bg-gray-100"
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
            className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <DashboardCard
          title="Unique Visitors"
          value={loadingVisitors ? '-' : stats.uniqueVisitors.toLocaleString()}
          icon={Globe}
          color="indigo"
          footer={
            <button
              onClick={(e) => { e.stopPropagation(); setShowVisitorBreakdown(!showVisitorBreakdown); }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              {showVisitorBreakdown ? 'Hide Details' : 'View Details'}
              <ArrowRight className="w-3 h-3" />
            </button>
          }
        />
        {showVisitorBreakdown && (
          <div className="col-span-full bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex gap-8 animate-in slide-in-from-top-2 duration-200">
            <div>
              <span className="text-sm text-gray-500">Anonymous</span>
              <p className="text-lg font-bold text-indigo-900">{visitorStats?.anonymous.toLocaleString() ?? '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Authenticated</span>
              <p className="text-lg font-bold text-indigo-900">{visitorStats?.authenticated.toLocaleString() ?? '-'}</p>
            </div>
          </div>
        )}

        <DashboardCard
          title="Total Reports"
          value={stats.totalReports.toLocaleString()}
          change={calculatePercentageChange(stats.totalReports, stats.previousTotalReports)}
          icon={FileText}
          color="blue"
          onClick={() => navigate('/admin?section=reports')}
        />
        <DashboardCard
          title="Pending"
          value={stats.pendingReports.toLocaleString()}
          change={calculatePercentageChange(stats.pendingReports, stats.previousPendingReports)}
          icon={Clock}
          color="yellow"
          onClick={() => navigate('/admin?section=reports&status=pending')}
        />
        <DashboardCard
          title="Resolved"
          value={stats.resolvedReports.toLocaleString()}
          change={calculatePercentageChange(stats.resolvedReports, stats.previousResolvedReports)}
          icon={CheckCircle2}
          color="green"
          onClick={() => navigate('/admin?section=reports&status=resolved')}
        />
        <DashboardCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          change={calculatePercentageChange(stats.totalUsers, stats.previousTotalUsers)}
          icon={Users}
          color="purple"
          onClick={() => navigate('/admin?section=users')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Charts) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ChartCard title="Report Status">
              <Doughnut
                data={{
                  labels: stats.reportsByStatus.map(s => formatStatusForDisplay(s.status)),
                  datasets: [{
                    data: stats.reportsByStatus.map(s => s.count),
                    backgroundColor: [
                      '#3b82f6', '#eab308', '#10b981', '#f97316', '#ef4444', '#6b7280'
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                  }]
                }}
                options={{
                  ...chartOptions,
                  cutout: '75%',
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } }
                  }
                }}
              />
            </ChartCard>

            <ChartCard title="Categories">
              <Bar
                data={{
                  labels: stats.reportsByCategory.slice(0, 5).map(c => c.category),
                  datasets: [{
                    label: 'Reports',
                    data: stats.reportsByCategory.slice(0, 5).map(c => c.count),
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                    barThickness: 24
                  }]
                }}
                options={{
                  ...chartOptions,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } }
                }}
              />
            </ChartCard>
          </div>

          <ChartCard title="Activity Trends">
            <Line
              data={{
                labels: stats.reportsByDay.map(d => d.day),
                datasets: [{
                  label: 'Reports',
                  data: stats.reportsByDay.map(d => d.count),
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 4,
                  pointHoverRadius: 6
                }]
              }}
              options={chartOptions}
            />
          </ChartCard>
        </div>

        {/* Right Column (Lists & Secondary Charts) */}
        <div className="space-y-8">
          {/* Recent Reports List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Recent Reports</h3>
              <button
                onClick={() => navigate('/admin?section=reports')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.recentReports.length > 0 ? (
                stats.recentReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => navigate(`/reports/${report.id}`)}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeStatusColor(report.status)}`}>
                        {formatStatusForDisplay(report.status)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {report.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      #{report.case_number} • {report.category}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">No recent reports found</div>
              )}
            </div>
          </div>

          {/* User Stats */}
          <ChartCard title="User Status">
            <div className="h-[200px]">
              <Pie
                data={{
                  labels: ['Active', 'Banned'],
                  datasets: [{
                    data: [stats.activeUsers, stats.bannedUsers],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                  }]
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15 } }
                  }
                }}
              />
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Active</p>
                <p className="text-xl font-bold text-emerald-600">{stats.activeUsers}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Banned</p>
                <p className="text-xl font-bold text-red-600">{stats.bannedUsers}</p>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
