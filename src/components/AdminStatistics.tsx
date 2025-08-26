import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, Calendar, Clock, User, AlertTriangle, Download, Filter, BarChart3, PieChart, Activity, MapPin } from 'lucide-react';
import { Notification } from './Notification';
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

// Register Chart.js components
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
  const [exporting, setExporting] = useState(false);
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
      console.log('Fetching statistics for time range:', timeRange);
      
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

      console.log('Date range:', { startDate: startDate.toISOString(), endDate: now.toISOString() });

      // Fetch reports data with date filter
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString());

      if (reportsError) {
        console.error('Reports fetch error:', reportsError);
        throw reportsError;
      }

      console.log('Reports fetched:', reports?.length || 0);

      // Fetch users data
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) {
        console.error('Users fetch error:', usersError);
        throw usersError;
      }

      console.log('Users fetched:', users?.length || 0);

      // Calculate basic statistics
      const totalReports = reports?.length || 0;
      const pendingReports = reports?.filter(r => r.status === 'pending').length || 0;
      const inProgressReports = reports?.filter(r => r.status === 'in_progress').length || 0;
      const resolvedReports = reports?.filter(r => r.status === 'resolved').length || 0;
      const totalUsers = users?.length || 0;
      const activeUsers = users?.filter(u => !u.is_banned).length || 0;
      const bannedUsers = users?.filter(u => u.is_banned).length || 0;

      console.log('Basic stats calculated:', {
        totalReports,
        pendingReports,
        inProgressReports,
        resolvedReports,
        totalUsers,
        activeUsers,
        bannedUsers
      });

      // Calculate reports by category with fallback
      const reportsByCategory = (reports || []).reduce((acc, report) => {
        const category = report.category || 'Unknown';
        const existing = acc.find(item => item.category === category);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ category, count: 1 });
        }
        return acc;
      }, [] as Array<{ category: string; count: number }>);

      // Calculate reports by location with fallback
      const reportsByLocation = (reports || []).reduce((acc, report) => {
        const location = report.location_address || report.location || 'Unknown Location';
        const existing = acc.find(item => item.location === location);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ location, count: 1 });
        }
        return acc;
      }, [] as Array<{ location: string; count: number }>);

      // Calculate reports by time of day
      const reportsByTime = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: (reports || []).filter(r => {
          try {
            return new Date(r.created_at).getHours() === hour;
          } catch (e) {
            console.warn('Invalid date for report:', r.created_at);
            return false;
          }
        }).length,
      }));

      // Calculate reports by day of week
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const reportsByDay = days.map(day => ({
        day,
        count: (reports || []).filter(r => {
          try {
            return days[new Date(r.created_at).getDay()] === day;
          } catch (e) {
            console.warn('Invalid date for report:', r.created_at);
            return false;
          }
        }).length,
      }));

      // Calculate reports by month
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const reportsByMonth = months.map(month => ({
        month,
        count: (reports || []).filter(r => {
          try {
            return months[new Date(r.created_at).getMonth()] === month;
          } catch (e) {
            console.warn('Invalid date for report:', r.created_at);
            return false;
          }
        }).length,
      }));

      // Calculate resolution times with better error handling
      const resolvedReportsWithTimes = (reports || []).filter(r => {
        try {
          return r.status === 'resolved' && r.created_at && r.updated_at && 
                 !isNaN(new Date(r.created_at).getTime()) && 
                 !isNaN(new Date(r.updated_at).getTime());
        } catch (e) {
          console.warn('Invalid date for resolved report:', r);
          return false;
        }
      });

      const resolutionTimes = resolvedReportsWithTimes.map(report => {
        try {
          const created = new Date(report.created_at).getTime();
          const updated = new Date(report.updated_at).getTime();
          return updated - created;
        } catch (e) {
          console.warn('Error calculating resolution time for report:', report);
          return 0;
        }
      }).filter(time => time > 0); // Filter out invalid times

      const totalResolutionTime = resolutionTimes.reduce((acc, time) => acc + time, 0);
      const averageResolutionTime = resolutionTimes.length > 0 ? totalResolutionTime / resolutionTimes.length : 0;
      const fastestResolutionTime = resolutionTimes.length > 0 ? Math.min(...resolutionTimes) : 0;
      const slowestResolutionTime = resolutionTimes.length > 0 ? Math.max(...resolutionTimes) : 0;

      console.log('Resolution times calculated:', {
        resolvedReportsWithTimes: resolvedReportsWithTimes.length,
        resolutionTimes: resolutionTimes.length,
        averageResolutionTime,
        fastestResolutionTime,
        slowestResolutionTime
      });

      // Store previous stats for trend calculation
      const previousStats = {
        totalReports: statistics.totalReports,
        pendingReports: statistics.pendingReports,
        resolvedReports: statistics.resolvedReports,
        totalUsers: statistics.totalUsers,
      };

      const newStats = {
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
      };

      console.log('Setting new statistics:', newStats);
      setStatistics(newStats);
      
      setNotification({
        message: `Statistics updated successfully for ${timeRange}`,
        type: 'success',
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      setNotification({
        message: 'Failed to load statistics. Please try again.',
        type: 'error',
      });
      
      // Set fallback data to prevent charts from breaking
      setStatistics(prev => ({
        ...prev,
        totalReports: 0,
        pendingReports: 0,
        inProgressReports: 0,
        resolvedReports: 0,
        totalUsers: 0,
        activeUsers: 0,
        bannedUsers: 0,
        reportsByCategory: [],
        reportsByLocation: [],
        reportsByTime: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
        reportsByDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => ({ day, count: 0 })),
        reportsByMonth: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => ({ month, count: 0 })),
        averageResolutionTime: 0,
        fastestResolutionTime: 0,
        slowestResolutionTime: 0,
      }));
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
    if (!milliseconds || isNaN(milliseconds)) return '0h 0m';
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Chart data configurations with fallbacks
  const reportsStatusData = {
    labels: ['Pending', 'In Progress', 'Resolved'],
    datasets: [
      {
        data: [
          Number(statistics.pendingReports) || 0, 
          Number(statistics.inProgressReports) || 0, 
          Number(statistics.resolvedReports) || 0
        ],
        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
        borderColor: ['#d97706', '#2563eb', '#059669'],
        borderWidth: 2,
      },
    ],
  };

  const reportsByCategoryData = {
    labels: (statistics.reportsByCategory || []).length > 0 
      ? statistics.reportsByCategory.map(item => item.category)
      : ['No Data'],
    datasets: [
      {
        label: 'Reports by Category',
        data: (statistics.reportsByCategory || []).length > 0
          ? statistics.reportsByCategory.map(item => Number(item.count) || 0)
          : [0],
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
          '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const reportsByTimeData = {
    labels: (statistics.reportsByTime || []).length > 0
      ? statistics.reportsByTime.map(item => `${item.hour.toString().padStart(2, '0')}:00`)
      : Array.from({ length: 24 }, (_, hour) => `${hour.toString().padStart(2, '0')}:00`),
    datasets: [
      {
        label: 'Reports',
        data: (statistics.reportsByTime || []).length > 0
          ? statistics.reportsByTime.map(item => Number(item.count) || 0)
          : Array.from({ length: 24 }, () => 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const reportsByDayData = {
    labels: (statistics.reportsByDay || []).map(item => item.day.substring(0, 3)),
    datasets: [
      {
        label: 'Reports',
        data: (statistics.reportsByDay || []).map(item => Number(item.count) || 0),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#10b981',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const reportsByMonthData = {
    labels: (statistics.reportsByMonth || []).map(item => item.month.substring(0, 3)),
    datasets: [
      {
        label: 'Reports',
        data: (statistics.reportsByMonth || []).map(item => Number(item.count) || 0),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const userActivityData = {
    labels: ['Active Users', 'Banned Users'],
    datasets: [
      {
        data: [Number(statistics.activeUsers) || 0, Number(statistics.bannedUsers) || 0],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: ['#059669', '#dc2626'],
        borderWidth: 2,
      },
    ],
  };

  // Additional chart data for enhanced analytics
  const resolutionTimeComparisonData = {
    labels: ['Average', 'Fastest', 'Slowest'],
    datasets: [
      {
        label: 'Resolution Time (hours)',
        data: [
          Number(statistics.averageResolutionTime || 0) / (1000 * 60 * 60),
          Number(statistics.fastestResolutionTime || 0) / (1000 * 60 * 60),
          Number(statistics.slowestResolutionTime || 0) / (1000 * 60 * 60)
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: ['#3b82f6', '#10b981', '#ef4444'],
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  const reportsEfficiencyData = {
    labels: ['Resolved', 'In Progress', 'Pending'],
    datasets: [
      {
        label: 'Efficiency Rate',
        data: [
          Number(statistics.resolvedReports) || 0,
          Number(statistics.inProgressReports) || 0,
          Number(statistics.pendingReports) || 0
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
        borderColor: ['#10b981', '#3b82f6', '#f59e0b'],
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  const exportStatistics = async () => {
    if (exporting) return; // Prevent multiple exports
    
    setExporting(true);
    try {
      // Generate timestamp for filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      
      // Prepare comprehensive data for CSV
      const csvData = [
        // Title and metadata
        ['Cars-G Admin Statistics Dashboard'],
        ['Generated on', new Date().toLocaleString()],
        ['Time Range', timeRange],
        ['Generated by', currentUser?.email || 'Unknown'],
        [],
        
        // Executive Summary
        ['EXECUTIVE SUMMARY'],
        ['Metric', 'Value', 'Percentage', 'Notes'],
        ['Total Reports', statistics.totalReports, '100%', 'All reports in selected time range'],
        ['Pending Reports', statistics.pendingReports, 
         statistics.totalReports > 0 ? ((statistics.pendingReports / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
         'Reports awaiting action'],
        ['In Progress Reports', statistics.inProgressReports,
         statistics.totalReports > 0 ? ((statistics.inProgressReports / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
         'Reports being processed'],
        ['Resolved Reports', statistics.resolvedReports,
         statistics.totalReports > 0 ? ((statistics.resolvedReports / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
         'Successfully completed reports'],
        ['Total Users', statistics.totalUsers, '100%', 'All registered users'],
        ['Active Users', statistics.activeUsers,
         statistics.totalUsers > 0 ? ((statistics.activeUsers / statistics.totalUsers) * 100).toFixed(1) + '%' : '0%',
         'Non-banned users'],
        ['Banned Users', statistics.bannedUsers,
         statistics.totalUsers > 0 ? ((statistics.bannedUsers / statistics.totalUsers) * 100).toFixed(1) + '%' : '0%',
         'Suspended users'],
        [],
        
        // Performance Metrics
        ['PERFORMANCE METRICS'],
        ['Metric', 'Value', 'Unit', 'Description'],
        ['Resolution Rate', 
         statistics.totalReports > 0 ? ((statistics.resolvedReports / statistics.totalReports) * 100).toFixed(1) : 0,
         '%', 'Percentage of reports successfully resolved'],
        ['Reports per User',
         statistics.totalUsers > 0 ? (statistics.totalReports / statistics.totalUsers).toFixed(2) : 0,
         'reports/user', 'Average reports submitted per user'],
        ['Pending Rate',
         statistics.totalReports > 0 ? ((statistics.pendingReports / statistics.totalReports) * 100).toFixed(1) : 0,
         '%', 'Percentage of reports still pending'],
        ['Active User Rate',
         statistics.totalUsers > 0 ? ((statistics.activeUsers / statistics.totalUsers) * 100).toFixed(1) : 0,
         '%', 'Percentage of active users'],
        [],
        
        // Resolution Time Analysis
        ['RESOLUTION TIME ANALYSIS'],
        ['Metric', 'Value', 'Unit', 'Description'],
        ['Average Resolution Time', formatTime(statistics.averageResolutionTime), 'time', 'Mean time to resolve reports'],
        ['Fastest Resolution', formatTime(statistics.fastestResolutionTime), 'time', 'Quickest report resolution'],
        ['Slowest Resolution', formatTime(statistics.slowestResolutionTime), 'time', 'Longest report resolution'],
        ['Total Resolved Reports', statistics.resolvedReports, 'count', 'Reports used for time calculation'],
        [],
        
        // Reports by Category Analysis
        ['REPORTS BY CATEGORY'],
        ['Category', 'Count', 'Percentage', 'Rank'],
        ...(statistics.reportsByCategory || [])
          .sort((a, b) => b.count - a.count)
          .map((item, index) => [
            item.category,
            item.count,
            statistics.totalReports > 0 ? ((item.count / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
            `#${index + 1}`
          ]),
        [],
        
        // Reports by Location Analysis
        ['REPORTS BY LOCATION'],
        ['Location', 'Count', 'Percentage', 'Rank'],
        ...(statistics.reportsByLocation || [])
          .sort((a, b) => b.count - a.count)
          .map((item, index) => [
            item.location,
            item.count,
            statistics.totalReports > 0 ? ((item.count / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
            `#${index + 1}`
          ]),
        [],
        
        // Time-based Analysis
        ['REPORTS BY TIME OF DAY'],
        ['Hour', 'Count', 'Percentage', '24-Hour Format'],
        ...(statistics.reportsByTime || []).map(item => [
          `${item.hour}:00`,
          item.count,
          statistics.totalReports > 0 ? ((item.count / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
          `${item.hour.toString().padStart(2, '0')}:00`
        ]),
        [],
        
        ['REPORTS BY DAY OF WEEK'],
        ['Day', 'Count', 'Percentage', 'Day Number'],
        ...(statistics.reportsByDay || []).map((item, index) => [
          item.day,
          item.count,
          statistics.totalReports > 0 ? ((item.count / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
          index + 1
        ]),
        [],
        
        ['REPORTS BY MONTH'],
        ['Month', 'Count', 'Percentage', 'Month Number'],
        ...(statistics.reportsByMonth || []).map((item, index) => [
          item.month,
          item.count,
          statistics.totalReports > 0 ? ((item.count / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
          index + 1
        ]),
        [],
        
        // Chart Data for External Analysis
        ['CHART DATA - REPORTS STATUS DISTRIBUTION'],
        ['Status', 'Count', 'Percentage', 'Color'],
        ['Pending', statistics.pendingReports, 
         statistics.totalReports > 0 ? ((statistics.pendingReports / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
         '#f59e0b'],
        ['In Progress', statistics.inProgressReports,
         statistics.totalReports > 0 ? ((statistics.inProgressReports / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
         '#3b82f6'],
        ['Resolved', statistics.resolvedReports,
         statistics.totalReports > 0 ? ((statistics.resolvedReports / statistics.totalReports) * 100).toFixed(1) + '%' : '0%',
         '#10b981'],
        [],
        
        ['CHART DATA - USER ACTIVITY'],
        ['User Type', 'Count', 'Percentage', 'Color'],
        ['Active Users', statistics.activeUsers,
         statistics.totalUsers > 0 ? ((statistics.activeUsers / statistics.totalUsers) * 100).toFixed(1) + '%' : '0%',
         '#10b981'],
        ['Banned Users', statistics.bannedUsers,
         statistics.totalUsers > 0 ? ((statistics.bannedUsers / statistics.totalUsers) * 100).toFixed(1) + '%' : '0%',
         '#ef4444'],
        [],
        
        // Data Quality Notes
        ['DATA QUALITY NOTES'],
        ['Note', 'Details'],
        ['Time Range', `Data covers ${timeRange} period`],
        ['Data Freshness', `Last updated: ${new Date().toLocaleString()}`],
        ['Total Records', `${statistics.totalReports} reports, ${statistics.totalUsers} users`],
        ['Export Format', 'CSV - Comma Separated Values'],
        ['Chart Compatibility', 'Data formatted for Excel, Google Sheets, and charting tools'],
        [],
        
        // Footer
        ['End of Report'],
        ['Generated by Cars-G Admin Dashboard'],
        ['For questions, contact system administrator']
      ];

      // Convert array to CSV string with proper escaping
      const csvString = csvData.map(row => 
        row.map(cell => {
          if (cell === null || cell === undefined) {
            return '';
          }
          const cellStr = cell.toString();
          // Handle cells that contain commas, quotes, or newlines by wrapping in quotes
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ).join('\n');

      // Add BOM for Excel compatibility
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvString;

      // Create and download the file
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cars-g-statistics-${timeRange}-${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success notification
      setNotification({
        message: `Statistics exported successfully to CSV (${timeRange})`,
        type: 'success',
      });

    } catch (error) {
      console.error('Error exporting statistics:', error);
      setNotification({
        message: 'Failed to export statistics. Please try again.',
        type: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  // Debug user state
  console.log('AdminStatistics - Current user:', currentUser);
  console.log('AdminStatistics - User role:', currentUser?.role);
  console.log('AdminStatistics - Is authenticated:', !!currentUser);

  if (currentUser?.role !== 'admin') {
    console.log('AdminStatistics - Access denied: User is not admin');
    return (
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Access Restricted
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You need administrator privileges to view this dashboard.</p>
                <p className="mt-1">Current user role: <strong>{currentUser?.role || 'Not authenticated'}</strong></p>
                <p className="mt-1">User ID: <strong>{currentUser?.id || 'N/A'}</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Safety check for statistics object
  if (!statistics || Object.keys(statistics).length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-gray-600">No statistics data available</p>
        </div>
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
                  disabled={loading || exporting}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export all statistics data to CSV format"
                >
                  <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
                  {exporting ? 'Exporting...' : 'Export CSV'}
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
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={exportStatistics}
                disabled={loading || exporting}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export all statistics data to CSV format"
              >
                <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

          {/* Charts Section */}
          <div className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
            {/* Reports Status Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center mb-4">
                    <PieChart className="h-5 w-5 text-blue-500 mr-2" />
                    <h4 className="text-base sm:text-lg font-medium text-gray-900">Reports Status Distribution</h4>
                  </div>
                  <div className="h-64 flex items-center justify-center">
                    <Doughnut 
                      data={reportsStatusData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const value = context.raw || context.parsed || 0;
                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                return `${context.label}: ${value} (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center mb-4">
                    <User className="h-5 w-5 text-green-500 mr-2" />
                    <h4 className="text-base sm:text-lg font-medium text-gray-900">User Activity Overview</h4>
                  </div>
                  <div className="h-64 flex items-center justify-center">
                    <Pie 
                      data={userActivityData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const value = context.raw || context.parsed || 0;
                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                return `${context.label}: ${value} (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Reports by Category */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center mb-4">
                  <BarChart3 className="h-5 w-5 text-purple-500 mr-2" />
                  <h4 className="text-base sm:text-lg font-medium text-gray-900">Reports by Category</h4>
                </div>
                <div className="h-64">
                  <Bar 
                    data={reportsByCategoryData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context: any) {
                              const value = context.raw || context.parsed || 0;
                              const total = (context.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
                              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                              return `${value} reports (${percentage}%)`;
                            }
                          }
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
              </div>
            </div>

            {/* Time-based Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center mb-4">
                    <Activity className="h-5 w-5 text-blue-500 mr-2" />
                    <h4 className="text-base sm:text-lg font-medium text-gray-900">Reports by Time of Day</h4>
                  </div>
                  <div className="h-64">
                    <Line 
                      data={reportsByTimeData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
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
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center mb-4">
                    <Calendar className="h-5 w-5 text-green-500 mr-2" />
                    <h4 className="text-base sm:text-lg font-medium text-gray-900">Reports by Day of Week</h4>
                  </div>
                  <div className="h-64">
                    <Bar 
                      data={reportsByDayData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
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
                </div>
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center mb-4">
                  <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
                  <h4 className="text-base sm:text-lg font-medium text-gray-900">Monthly Reports Trend</h4>
                </div>
                <div className="h-64">
                  <Line 
                    data={reportsByMonthData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
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
              </div>
            </div>

            {/* Additional Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center mb-4">
                    <Clock className="h-5 w-5 text-blue-500 mr-2" />
                    <h4 className="text-base sm:text-lg font-medium text-gray-900">Resolution Time Comparison</h4>
                  </div>
                  <div className="h-64">
                    <Bar 
                      data={resolutionTimeComparisonData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context: any) {
                                const value = context.raw || context.parsed || 0;
                                const hours = typeof value === 'number' ? value.toFixed(1) : '0.0';
                                return `${hours} hours`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Hours'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="h-5 w-5 text-green-500 mr-2" />
                    <h4 className="text-base sm:text-lg font-medium text-gray-900">Reports Processing Efficiency</h4>
                  </div>
                  <div className="h-64">
                    <Bar 
                      data={reportsEfficiencyData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context: any) {
                                const value = context.raw || context.parsed || 0;
                                const total = (context.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                return `${value} reports (${percentage}%)`;
                              }
                            }
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

          {/* Performance Metrics Summary */}
          <div className="mt-6 sm:mt-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center mb-4">
                  <Activity className="h-5 w-5 text-indigo-500 mr-2" />
                  <h4 className="text-base sm:text-lg font-medium text-gray-900">Performance Metrics Summary</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {statistics.totalReports > 0 ? ((statistics.resolvedReports / statistics.totalReports) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-sm text-blue-800">Resolution Rate</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {statistics.totalUsers > 0 ? (statistics.totalReports / statistics.totalUsers).toFixed(1) : 0}
                    </p>
                    <p className="text-sm text-green-800">Reports per User</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {statistics.totalReports > 0 ? ((statistics.pendingReports / statistics.totalReports) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-sm text-yellow-800">Pending Rate</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {statistics.totalUsers > 0 ? ((statistics.activeUsers / statistics.totalUsers) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-sm text-purple-800">Active Users</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Activity Details */}
          <div className="mt-6 sm:mt-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <h4 className="text-base sm:text-lg font-medium text-gray-900">User Activity Details</h4>
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

          {/* Top Locations */}
          {(statistics.reportsByLocation || []).length > 0 && (
            <div className="mt-6 sm:mt-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center mb-4">
                    <MapPin className="h-5 w-5 text-red-500 mr-2" />
                    <h4 className="text-base sm:text-lg font-medium text-gray-900">Top Report Locations</h4>
                  </div>
                  <div className="space-y-3">
                    {statistics.reportsByLocation
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5)
                      .map((item, index) => (
                        <div key={item.location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                            <span className="text-sm font-medium text-gray-900 truncate max-w-xs">{item.location}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-red-500 h-2 rounded-full"
                                style={{ width: `${(item.count / Math.max(...(statistics.reportsByLocation || []).map(r => r.count || 0), 1)) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{item.count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Information */}
          <div className="mt-6 sm:mt-8">
            <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center mb-4">
                  <Activity className="h-5 w-5 text-gray-500 mr-2" />
                  <h4 className="text-base sm:text-lg font-medium text-gray-700">Debug Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Time Range:</p>
                    <p className="font-mono text-gray-800">{timeRange}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Reports:</p>
                    <p className="font-mono text-gray-800">{statistics.totalReports}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Users:</p>
                    <p className="font-mono text-gray-800">{statistics.totalUsers}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Categories Found:</p>
                    <p className="font-mono text-gray-800">{(statistics.reportsByCategory || []).length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Locations Found:</p>
                    <p className="font-mono text-gray-800">{(statistics.reportsByLocation || []).length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Last Updated:</p>
                    <p className="font-mono text-gray-800">{new Date().toLocaleTimeString()}</p>
                  </div>
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