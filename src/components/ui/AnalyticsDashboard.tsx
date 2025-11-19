import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, FileText, Clock, Award, MapPin, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { SkeletonLoader } from './SkeletonLoader';
import { formatDistanceToNow } from 'date-fns';

export interface AnalyticsData {
  totalReports: number;
  reportsThisWeek: number;
  reportsThisMonth: number;
  averageResolutionTime: number;
  totalUsers: number;
  activeUsers: number;
  topCategories: Array<{ category: string; count: number }>;
  reportsByStatus: Array<{ status: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: 'report' | 'user' | 'achievement';
    description: string;
    timestamp: string;
  }>;
}

export interface AnalyticsDashboardProps {
  userId?: string; // If provided, shows user-specific analytics
  timeRange?: 'week' | 'month' | 'year' | 'all';
  className?: string;
}

export function AnalyticsDashboard({
  userId,
  timeRange = 'month',
  className
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [userId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      if (userId) {
        // User-specific analytics
        const [reports, userProfile] = await Promise.all([
          supabase
            .from('reports')
            .select('*', { count: 'exact' })
            .eq('user_id', userId),
          supabase
            .from('profiles')
            .select('points, created_at')
            .eq('id', userId)
            .single()
        ]);

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const reportsData = reports.data || [];
        const reportsThisWeek = reportsData.filter(r => 
          new Date(r.created_at) >= weekAgo
        ).length;
        const reportsThisMonth = reportsData.filter(r => 
          new Date(r.created_at) >= monthAgo
        ).length;

        // Calculate average resolution time
        const resolvedReports = reportsData.filter(r => r.status === 'resolved');
        let avgResolutionTime = 0;
        if (resolvedReports.length > 0) {
          const totalTime = resolvedReports.reduce((sum, r) => {
            const created = new Date(r.created_at).getTime();
            const updated = new Date(r.updated_at || r.created_at).getTime();
            return sum + (updated - created);
          }, 0);
          avgResolutionTime = totalTime / resolvedReports.length / (1000 * 60 * 60); // hours
        }

        // Top categories
        const categoryCounts = new Map<string, number>();
        reportsData.forEach(r => {
          categoryCounts.set(r.category, (categoryCounts.get(r.category) || 0) + 1);
        });
        const topCategories = Array.from(categoryCounts.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Reports by status
        const statusCounts = new Map<string, number>();
        reportsData.forEach(r => {
          statusCounts.set(r.status, (statusCounts.get(r.status) || 0) + 1);
        });
        const reportsByStatus = Array.from(statusCounts.entries())
          .map(([status, count]) => ({ status, count }));

        // Recent activity
        const recentReports = reportsData
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(r => ({
            id: r.id,
            type: 'report' as const,
            description: `Reported: ${r.title}`,
            timestamp: r.created_at
          }));

        setData({
          totalReports: reports.count || 0,
          reportsThisWeek,
          reportsThisMonth,
          averageResolutionTime: avgResolutionTime,
          totalUsers: 1,
          activeUsers: 1,
          topCategories,
          reportsByStatus,
          recentActivity: recentReports
        });
      } else {
        // System-wide analytics (admin view)
        const [reports, users] = await Promise.all([
          supabase
            .from('reports')
            .select('*', { count: 'exact' }),
          supabase
            .from('profiles')
            .select('id, created_at, last_seen')
            .eq('is_banned', false)
        ]);

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const reportsData = reports.data || [];
        const reportsThisWeek = reportsData.filter(r => 
          new Date(r.created_at) >= weekAgo
        ).length;
        const reportsThisMonth = reportsData.filter(r => 
          new Date(r.created_at) >= monthAgo
        ).length;

        const activeUsers = users.data?.filter(u => {
          if (!u.last_seen) return false;
          const lastSeen = new Date(u.last_seen);
          return lastSeen >= weekAgo;
        }).length || 0;

        // Top categories
        const categoryCounts = new Map<string, number>();
        reportsData.forEach(r => {
          categoryCounts.set(r.category, (categoryCounts.get(r.category) || 0) + 1);
        });
        const topCategories = Array.from(categoryCounts.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Reports by status
        const statusCounts = new Map<string, number>();
        reportsData.forEach(r => {
          statusCounts.set(r.status, (statusCounts.get(r.status) || 0) + 1);
        });
        const reportsByStatus = Array.from(statusCounts.entries())
          .map(([status, count]) => ({ status, count }));

        // Recent activity
        const recentReports = reportsData
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(r => ({
            id: r.id,
            type: 'report' as const,
            description: `New report: ${r.title}`,
            timestamp: r.created_at
          }));

        setData({
          totalReports: reports.count || 0,
          reportsThisWeek,
          reportsThisMonth,
          averageResolutionTime: 0, // Calculate if needed
          totalUsers: users.data?.length || 0,
          activeUsers,
          topCategories,
          reportsByStatus,
          recentActivity: recentReports
        });
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <SkeletonDashboard />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <p className="text-red-600">{error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<FileText className="h-5 w-5" />}
          label="Total Reports"
          value={data.totalReports.toLocaleString()}
          change={`${data.reportsThisWeek} this week`}
          color="blue"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="This Month"
          value={data.reportsThisMonth.toLocaleString()}
          change={`${data.reportsThisWeek} this week`}
          color="green"
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Avg Resolution"
          value={data.averageResolutionTime > 0 
            ? `${Math.round(data.averageResolutionTime)}h`
            : 'N/A'}
          change={userId ? 'Your reports' : 'All reports'}
          color="purple"
        />
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label={userId ? 'Your Activity' : 'Active Users'}
          value={userId ? 'Active' : data.activeUsers.toLocaleString()}
          change={userId ? 'This month' : `${data.totalUsers} total`}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Top Categories
          </h3>
          <div className="space-y-3">
            {data.topCategories.length > 0 ? (
              data.topCategories.map((item, index) => (
                <div key={item.category} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{item.category}</span>
                      <span className="text-sm text-gray-500">{item.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{
                          width: `${(item.count / (data.topCategories[0]?.count || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Reports by Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Reports by Status
          </h3>
          <div className="space-y-3">
            {data.reportsByStatus.length > 0 ? (
              data.reportsByStatus.map(item => (
                <div key={item.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {item.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {data.recentActivity.length > 0 ? (
            data.recentActivity.map(activity => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {activity.type === 'report' && <FileText className="h-4 w-4 text-blue-600" />}
                  {activity.type === 'user' && <Users className="h-4 w-4 text-green-600" />}
                  {activity.type === 'achievement' && <Award className="h-4 w-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  change,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={cn('p-2 rounded-lg border', colorClasses[color])}>
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600 mt-1">{label}</p>
        <p className="text-xs text-gray-500 mt-1">{change}</p>
      </div>
    </div>
  );
}

