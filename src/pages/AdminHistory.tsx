import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Check, 
  Eye, 
  Calendar, 
  MapPin, 
  User2, 
  Filter,
  Search,
  Download,
  Printer,
  Shield,
  Clock
} from 'lucide-react';
import type { Report } from '../types';
import { supabase } from '../lib/supabase';

interface ReportWithPatrol extends Report {
  patrol_officer_name?: string;
}

export function AdminHistory() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportWithPatrol[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithPatrol[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Parse reports from URL parameters
    const resolvedReports: ReportWithPatrol[] = [];
    let index = 0;
    
    while (true) {
      const reportParam = searchParams.get(`report_${index}`);
      if (!reportParam) break;
      
      try {
        const report = JSON.parse(reportParam);
        resolvedReports.push(report);
      } catch (error) {
        console.error('Error parsing report:', error);
      }
      
      index++;
    }
    
    setReports(resolvedReports);
    setFilteredReports(resolvedReports);
    
    // Fetch patrol officer names for reports that have patrol_user_id
    if (resolvedReports.length > 0) {
      fetchPatrolOfficerNames(resolvedReports);
    }
  }, [searchParams]);

  const fetchPatrolOfficerNames = async (reports: ReportWithPatrol[]) => {
    try {
      // Get unique patrol user IDs
      const patrolUserIds = reports
        .filter(report => report.patrol_user_id)
        .map(report => report.patrol_user_id)
        .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

      if (patrolUserIds.length === 0) return;

      // Fetch patrol officer profiles
      const { data: patrolProfiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', patrolUserIds);

      if (error) {
        console.error('Error fetching patrol profiles:', error);
        return;
      }

      // Create a map of patrol user ID to name
      const patrolNameMap = new Map();
      patrolProfiles?.forEach(profile => {
        patrolNameMap.set(profile.id, profile.full_name || profile.username || 'Unknown');
      });

      // Update reports with patrol officer names
      const updatedReports = reports.map(report => ({
        ...report,
        patrol_officer_name: report.patrol_user_id ? patrolNameMap.get(report.patrol_user_id) : undefined
      }));

      setReports(updatedReports);
      setFilteredReports(updatedReports);
    } catch (error) {
      console.error('Error in fetchPatrolOfficerNames:', error);
    }
  };

  useEffect(() => {
    // Filter reports based on search term and category
    let filtered = reports;
    
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.patrol_officer_name && report.patrol_officer_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(report => report.category === categoryFilter);
    }
    
    setFilteredReports(filtered);
  }, [reports, searchTerm, categoryFilter]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'infrastructure': 'bg-blue-100 text-blue-800 border-blue-200',
      'safety': 'bg-red-100 text-red-800 border-red-200',
      'environment': 'bg-green-100 text-green-800 border-green-200',
      'traffic': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'noise': 'bg-purple-100 text-purple-800 border-purple-200',
      'other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category] || colors.other;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-green-100 text-green-800 border-green-200',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'high': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[priority] || colors.medium;
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Description', 'Category', 'Priority', 'Reporter', 'Patrol Officer', 'Date', 'Location'];
    const csvContent = [
      headers.join(','),
      ...filteredReports.map(report => [
        `"${report.title}"`,
        `"${report.description}"`,
        report.category,
        report.priority,
        report.username,
        report.patrol_officer_name || 'Not Assigned',
        new Date(report.created_at).toLocaleDateString(),
        report.location_address
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resolved-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printPage = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors hover:shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Resolved Reports History</h1>
                  <p className="text-sm text-gray-600">View all completed and resolved reports</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors hover:shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={printPage}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors hover:shadow-sm"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search reports by title, description, reporter, or patrol officer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="all">All Categories</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="safety">Safety</option>
                <option value="environment">Environment</option>
                <option value="traffic">Traffic</option>
                <option value="noise">Noise</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Resolved</p>
                <p className="text-3xl font-bold text-gray-900">{reports.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Filter className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Filtered</p>
                <p className="text-3xl font-bold text-gray-900">{filteredReports.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-gray-900">
                  {reports.filter(r => {
                    const reportDate = new Date(r.created_at);
                    const now = new Date();
                    return reportDate.getMonth() === now.getMonth() && 
                           reportDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-3xl font-bold text-gray-900">
                  {new Set(reports.map(r => r.category)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
            <h2 className="text-xl font-semibold text-gray-900">Resolved Reports</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing {filteredReports.length} of {reports.length} resolved reports
            </p>
          </div>
          
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Check className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredReports.map((report) => (
                <div key={report.id} className="p-8 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">{report.title}</h3>
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getCategoryColor(report.category)}`}>
                          {report.category.charAt(0).toUpperCase() + report.category.slice(1)}
                        </span>
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getPriorityColor(report.priority)}`}>
                          {report.priority.charAt(0).toUpperCase() + report.priority.slice(1)} Priority
                        </span>
                      </div>
                      <p className="text-gray-600 text-base leading-relaxed mb-4">{report.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <User2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Reporter</p>
                        <p className="font-medium text-gray-900">{report.username}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Patrol Officer</p>
                        <p className="font-medium text-gray-900">
                          {report.patrol_officer_name || 'Not Assigned'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Date</p>
                        <p className="font-medium text-gray-900">{formatDate(report.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Location</p>
                        <p className="font-medium text-gray-900 truncate">{report.location_address}</p>
                      </div>
                    </div>
                  </div>
                  
                  {report.images && report.images.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm text-gray-500 mb-3 font-medium">Attached Images</p>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {report.images.map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Report image ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => window.open(image, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
