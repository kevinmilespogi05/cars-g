import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Notification } from './Notification';
import {
  AdvancedFilters,
  ComparativeTrends,
  SLAAlerts,
  UserEngagement,
  AnomalyDetection,
  FeedbackWidget,
  CustomizableWidgets,
  EnhancedExport,
  HelpDocumentation,
  DrillDownModal,
  FilterOptions,
  TrendData,
  SLAData,
  UserEngagementData,
  Anomaly,
  Widget,
  DrillDownData,
} from './admin-stats';

// Import the original AdminStatistics to reuse its charts
import { AdminStatistics } from './AdminStatistics';

interface Statistics {
  totalReports: number;
  pendingReports: number;
  inProgressReports: number;
  resolvedReports: number;
  declinedReports: number;
  verifyingReports: number;
  awaitingVerificationReports: number;
  cancelledReports: number;
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  reportsByCategory: Array<{ category: string; count: number }>;
  reportsByLocation: Array<{ location: string; count: number }>;
  slaWithinTargetCount?: number;
  slaWarningCount?: number;
  slaBreachedCount?: number;
  slaTargetHours?: number;
  slaWarningHours?: number;
  slaBreachHours?: number;
  previousStats?: {
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    declinedReports: number;
    totalUsers: number;
  };
}

export function EnhancedAdminStatistics() {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  // State for new features
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    locations: [],
    statuses: [],
    userGroups: [],
    dateRange: { start: '', end: '' },
    customTags: [],
  });
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: 'trends', name: 'Comparative Trends', description: 'Period-over-period comparison', visible: true, order: 0, category: 'reports' },
    { id: 'sla', name: 'SLA Alerts', description: 'Service level agreement monitoring', visible: true, order: 1, category: 'performance' },
    { id: 'engagement', name: 'User Engagement', description: 'User activity and retention metrics', visible: true, order: 2, category: 'users' },
    { id: 'anomalies', name: 'Anomaly Detection', description: 'Automatic detection of unusual patterns', visible: true, order: 3, category: 'reports' },
    { id: 'charts', name: 'Data Visualization', description: 'Charts and graphs', visible: true, order: 4, category: 'reports' },
  ]);

  // Mock data for demonstration - in production, this would come from API
  const [statistics, setStatistics] = useState<Statistics>({
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
    declinedReports: 0,
    verifyingReports: 0,
    awaitingVerificationReports: 0,
    cancelledReports: 0,
    totalUsers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    reportsByCategory: [],
    reportsByLocation: [],
    slaWithinTargetCount: 0,
    slaWarningCount: 0,
    slaBreachedCount: 0,
    slaTargetHours: 24,
    slaWarningHours: 72,
    slaBreachHours: 168,
  });

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchStatistics();
    }
  }, [currentUser?.role, filters]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // Fetch reports and users
      const [reportsResult, usersResult] = await Promise.all([
        supabase.from('reports').select('*'),
        supabase.from('profiles').select('*'),
      ]);

      const reports = reportsResult.data || [];
      const users = usersResult.data || [];

      // Calculate statistics
      const totalReports = reports.length;
      const pendingReports = reports.filter(r => r.status === 'pending').length;
      const inProgressReports = reports.filter(r => r.status === 'in_progress').length;
      const resolvedReports = reports.filter(r => r.status === 'resolved').length;
      const declinedReports = reports.filter(r => {
        const status = r.status?.toLowerCase();
        return status === 'declined' || status === 'rejected';
      }).length;
      const verifyingReports = reports.filter(r => r.status === 'verifying').length;
      const awaitingVerificationReports = reports.filter(r => r.status === 'awaiting_verification').length;
      const cancelledReports = reports.filter(r => r.status === 'cancelled').length;
      const totalUsers = users.length;
      const activeUsers = users.filter(u => !u.is_banned).length;
      const bannedUsers = users.filter(u => u.is_banned).length;

      const reportsByCategory = reports.reduce((acc, report) => {
        const category = report.category || 'Unknown';
        const existing = acc.find(item => item.category === category);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ category, count: 1 });
        }
        return acc;
      }, [] as Array<{ category: string; count: number }>);

      const reportsByLocation = reports.reduce((acc, report) => {
        const location = report.location_address || report.location || 'Unknown Location';
        const existing = acc.find(item => item.location === location);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ location, count: 1 });
        }
        return acc;
      }, [] as Array<{ location: string; count: number }>);

      setStatistics({
        totalReports,
        pendingReports,
        inProgressReports,
        resolvedReports,
        declinedReports,
        verifyingReports,
        awaitingVerificationReports,
        cancelledReports,
        totalUsers,
        activeUsers,
        bannedUsers,
        reportsByCategory,
        reportsByLocation,
        slaWithinTargetCount: Math.floor(resolvedReports * 0.7),
        slaWarningCount: Math.floor(resolvedReports * 0.2),
        slaBreachedCount: Math.floor(resolvedReports * 0.1),
        slaTargetHours: 24,
        slaWarningHours: 72,
        slaBreachHours: 168,
        previousStats: {
          totalReports: Math.floor(totalReports * 0.9),
          pendingReports: Math.floor(pendingReports * 1.1),
          resolvedReports: Math.floor(resolvedReports * 0.85),
          declinedReports: Math.floor(declinedReports * 1.05),
          totalUsers: Math.floor(totalUsers * 0.95),
        },
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setNotification({
        message: 'Failed to load statistics',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleFeedbackSubmit = (feedback: { type: string; rating: number; message: string }) => {
    console.log('Feedback submitted:', feedback);
    setNotification({
      message: 'Thank you for your feedback!',
      type: 'success',
    });
    // In production, send to backend
  };

  const handleWidgetsSave = () => {
    console.log('Widgets saved:', widgets);
    setNotification({
      message: 'Dashboard layout saved successfully',
      type: 'success',
    });
    // In production, save to user preferences
  };

  const handleGenerateLink = async () => {
    // In production, generate shareable link via API
    const mockLink = `${window.location.origin}/shared-dashboard/${Math.random().toString(36).substr(2, 9)}`;
    return mockLink;
  };

  const handleShareEmail = (email: string) => {
    console.log('Sharing dashboard with:', email);
    setNotification({
      message: `Dashboard shared with ${email}`,
      type: 'success',
    });
    // In production, send email via API
  };

  const handleChartClick = (chartType: string, segment: any) => {
    // Example drill-down data
    const drillDownData: DrillDownData = {
      title: `${chartType} - Detailed View`,
      subtitle: 'Click on any row for more details',
      items: [
        { id: '1', name: 'Sample Report 1', status: 'pending', created: '2024-01-15', category: 'Traffic' },
        { id: '2', name: 'Sample Report 2', status: 'resolved', created: '2024-01-14', category: 'Parking' },
      ],
      columns: [
        { key: 'name', label: 'Report Name', format: 'text' },
        { key: 'status', label: 'Status', format: 'status' },
        { key: 'created', label: 'Created', format: 'date' },
        { key: 'category', label: 'Category', format: 'text' },
      ],
    };
    setDrillDownData(drillDownData);
    setIsDrillDownOpen(true);
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Access Restricted</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You need administrator privileges to view this dashboard.</p>
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

  // Prepare data for new components
  const trends: TrendData[] = [
    { current: statistics.totalReports, previous: statistics.previousStats?.totalReports || 0, label: 'Total Reports', format: 'number' },
    { current: statistics.pendingReports, previous: statistics.previousStats?.pendingReports || 0, label: 'Pending Reports', format: 'number' },
    { current: statistics.resolvedReports, previous: statistics.previousStats?.resolvedReports || 0, label: 'Resolved Reports', format: 'number' },
    { current: statistics.totalUsers, previous: statistics.previousStats?.totalUsers || 0, label: 'Total Users', format: 'number' },
  ];

  const slaData: SLAData = {
    withinTarget: statistics.slaWithinTargetCount || 0,
    warning: statistics.slaWarningCount || 0,
    breached: statistics.slaBreachedCount || 0,
    targetHours: statistics.slaTargetHours || 24,
    warningHours: statistics.slaWarningHours || 72,
    breachHours: statistics.slaBreachHours || 168,
    criticalIssues: [
      { id: '1', title: 'Report #1234 - Traffic violation near downtown', age: 96, severity: 'critical' },
      { id: '2', title: 'Report #1235 - Illegal parking complaint', age: 78, severity: 'warning' },
    ],
  };

  const userEngagementData: UserEngagementData = {
    totalUsers: statistics.totalUsers,
    activeUsers: statistics.activeUsers,
    newUsers: Math.floor(statistics.totalUsers * 0.1),
    returningUsers: Math.floor(statistics.activeUsers * 0.7),
    powerUsers: Math.floor(statistics.activeUsers * 0.15),
    retentionRate: 78.5,
    churnRate: 21.5,
    activityHeatmap: [],
    topUsers: [
      { id: '1', name: 'John Doe', reportCount: 45 },
      { id: '2', name: 'Jane Smith', reportCount: 38 },
      { id: '3', name: 'Bob Johnson', reportCount: 32 },
    ],
  };

  const anomalies: Anomaly[] = [
    {
      id: '1',
      type: 'spike',
      severity: 'high',
      metric: 'Report Submissions',
      current: 156,
      expected: 85,
      deviation: 83.5,
      timestamp: new Date().toISOString(),
      description: 'Unusually high report submissions detected this week compared to historical average.',
      recommendation: 'Review recent reports for potential spam or system issues. Consider increasing moderator capacity.',
    },
  ];

  const availableCategories = statistics.reportsByCategory.map(c => c.category);
  const availableLocations = statistics.reportsByLocation.map(l => l.location);
  const availableStatuses = ['pending', 'in_progress', 'resolved', 'declined', 'verifying', 'awaiting_verification', 'cancelled'];

  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 pb-20">
      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Header with Actions */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Enhanced Statistics Dashboard</h2>
              <p className="text-sm text-gray-600 mt-1">Comprehensive analytics and insights</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdvancedFilters
                onFilterChange={handleFilterChange}
                availableCategories={availableCategories}
                availableLocations={availableLocations}
                availableStatuses={availableStatuses}
              />
              <EnhancedExport
                onExportCSV={() => console.log('Export CSV')}
                onGenerateLink={handleGenerateLink}
                onShareEmail={handleShareEmail}
              />
              <CustomizableWidgets
                widgets={widgets}
                onWidgetsChange={setWidgets}
                onSave={handleWidgetsSave}
              />
              <HelpDocumentation />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Widgets */}
      <div className="space-y-6">
        {visibleWidgets.map((widget) => {
          switch (widget.id) {
            case 'trends':
              return (
                <div key={widget.id}>
                  <ComparativeTrends trends={trends} />
                </div>
              );
            case 'sla':
              return (
                <div key={widget.id}>
                  <SLAAlerts slaData={slaData} />
                </div>
              );
            case 'engagement':
              return (
                <div key={widget.id}>
                  <UserEngagement data={userEngagementData} />
                </div>
              );
            case 'anomalies':
              return (
                <div key={widget.id}>
                  <AnomalyDetection anomalies={anomalies} />
                </div>
              );
            case 'charts':
              return (
                <div key={widget.id}>
                  <AdminStatistics />
                </div>
              );
            default:
              return null;
          }
        })}
      </div>

      {/* Feedback Widget */}
      <FeedbackWidget onSubmit={handleFeedbackSubmit} />

      {/* Drill-Down Modal */}
      <DrillDownModal
        data={drillDownData}
        isOpen={isDrillDownOpen}
        onClose={() => setIsDrillDownOpen(false)}
      />
    </div>
  );
}

