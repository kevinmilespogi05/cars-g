import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Loader2, Check, X, AlertTriangle, MapPin, Filter, Search } from 'lucide-react';
import { awardPoints } from '../lib/points';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  location_address: string;
  created_at: string;
  user_id: string;
  user: {
    username: string;
  };
  images: string[];
}

export function AdminDashboard() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          user:profiles(username)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: Report['status']) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      // Award points based on status change
      const report = reports.find(r => r.id === reportId);
      if (report) {
        if (newStatus === 'in_progress') {
          await awardPoints(report.user_id, 'REPORT_VERIFIED', reportId);
        } else if (newStatus === 'resolved') {
          await awardPoints(report.user_id, 'REPORT_RESOLVED', reportId);
        }
      }

      // Refresh reports
      fetchReports();
    } catch (error) {
      console.error('Error updating report status:', error);
    }
  };

  const filteredReports = reports.filter(report => {
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      report.title.toLowerCase().includes(searchLower) ||
      report.description.toLowerCase().includes(searchLower) ||
      report.category.toLowerCase().includes(searchLower) ||
      report.location_address.toLowerCase().includes(searchLower) ||
      report.user.username.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Report['priority']) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">All Reports</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <li key={report.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedReport(report)}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-blue-600 truncate">{report.title}</p>
                      <div className={`ml-2 flex-shrink-0 flex`}>
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </p>
                      </div>
                      <div className={`ml-2 flex-shrink-0 flex`}>
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(report.priority)}`}>
                          {report.priority}
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {report.category}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        <MapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {report.location_address}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <div className="text-sm text-gray-500">
                        Reported by {report.user.username}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6">
                  <div className="flex justify-end space-x-2">
                    {report.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateReportStatus(report.id, 'in_progress');
                        }}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Verify
                      </button>
                    )}
                    {report.status === 'in_progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateReportStatus(report.id, 'resolved');
                        }}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Resolve
                      </button>
                    )}
                    {(report.status === 'pending' || report.status === 'in_progress') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateReportStatus(report.id, 'rejected');
                        }}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{selectedReport.title}</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{selectedReport.description}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Category</h4>
                  <p className="mt-1 text-sm text-gray-900">{selectedReport.category}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Priority</h4>
                  <p className={`mt-1 text-sm font-medium ${getPriorityColor(selectedReport.priority)}`}>
                    {selectedReport.priority}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <p className={`mt-1 text-sm font-medium ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Reported By</h4>
                  <div className="text-sm text-gray-500">
                    {selectedReport.user.username}
                  </div>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Location</h4>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                    {selectedReport.location_address}
                  </p>
                </div>
              </div>
              {selectedReport.images && selectedReport.images.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500">Images</h4>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {selectedReport.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Report image ${index + 1}`}
                        className="h-24 w-full object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-5 flex justify-end space-x-2">
                {selectedReport.status === 'pending' && (
                  <button
                    onClick={() => {
                      updateReportStatus(selectedReport.id, 'in_progress');
                      setSelectedReport(null);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Verify Report
                  </button>
                )}
                {selectedReport.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      updateReportStatus(selectedReport.id, 'resolved');
                      setSelectedReport(null);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Mark as Resolved
                  </button>
                )}
                {(selectedReport.status === 'pending' || selectedReport.status === 'in_progress') && (
                  <button
                    onClick={() => {
                      updateReportStatus(selectedReport.id, 'rejected');
                      setSelectedReport(null);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject Report
                  </button>
                )}
                <button
                  onClick={() => setSelectedReport(null)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 