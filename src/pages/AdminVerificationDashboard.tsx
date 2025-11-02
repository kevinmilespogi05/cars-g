import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import AdminVerificationQueue from '../components/AdminVerificationQueue';

const AdminVerificationDashboard: React.FC = () => {
  const [showQueue, setShowQueue] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    declined: 0,
    total: 0
  });

  // Mock stats - in real implementation, fetch from API
  React.useEffect(() => {
    // Fetch stats from API
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/verification-queue?status=all&limit=1');
        const data = await response.json();
        
        if (data.success) {
          setStats({
            pending: data.data.statistics.byStatus.pending || 0,
            approved: data.data.statistics.byStatus.approved || 0,
            declined: data.data.statistics.byStatus.declined || 0,
            total: Object.values(data.data.statistics.byStatus).reduce((a: number, b: number) => a + b, 0)
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      name: 'Pending Review',
      value: stats.pending,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      name: 'Approved',
      value: stats.approved,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Declined',
      value: stats.declined,
      icon: XCircleIcon,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      name: 'Total Requests',
      value: stats.total,
      icon: DocumentCheckIcon,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Verification Dashboard</h1>
                <p className="mt-2 text-gray-600">
                  Manage user ID verification requests and approvals
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowQueue(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <UserGroupIcon className="w-4 h-4 mr-2" />
                  View Queue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-md ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowQueue(true)}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ClockIcon className="w-8 h-8 text-yellow-600 mr-4" />
                <div className="text-left">
                  <h4 className="font-medium text-gray-900">Review Pending</h4>
                  <p className="text-sm text-gray-600">Review {stats.pending} pending verification requests</p>
                </div>
              </button>

              <button
                onClick={() => setShowQueue(true)}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CheckCircleIcon className="w-8 h-8 text-green-600 mr-4" />
                <div className="text-left">
                  <h4 className="font-medium text-gray-900">Approved Requests</h4>
                  <p className="text-sm text-gray-600">View {stats.approved} approved verifications</p>
                </div>
              </button>

              <button
                onClick={() => setShowQueue(true)}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <XCircleIcon className="w-8 h-8 text-red-600 mr-4" />
                <div className="text-left">
                  <h4 className="font-medium text-gray-900">Declined Requests</h4>
                  <p className="text-sm text-gray-600">Review {stats.declined} declined verifications</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <DocumentCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
              <p className="text-gray-500">
                Recent verification activities will appear here.
              </p>
              <button
                onClick={() => setShowQueue(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
              >
                View All Requests
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Queue Modal */}
      {showQueue && (
        <AdminVerificationQueue onClose={() => setShowQueue(false)} />
      )}
    </div>
  );
};

export default AdminVerificationDashboard;
