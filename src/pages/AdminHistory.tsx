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
  Clock,
  XCircle
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeTab, setActiveTab] = useState<'resolved' | 'rejected'>('resolved');

  useEffect(() => {
    fetchAllReports();
    
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab');
    if (tabParam === 'rejected') {
      setActiveTab('rejected');
    }
  }, [searchParams]);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      // Fetch both resolved and rejected reports
      const { data: reportsData, error } = await supabase
        .from('reports')
        .select(`
          id,
          title,
          description,
          category,
          status,
          priority,
          location,
          location_address,
          created_at,
          user_id,
          patrol_user_id,
          images,
          case_number
        `)
        .in('status', ['resolved', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reportsWithPatrol: ReportWithPatrol[] = reportsData || [];
      
      // Fetch usernames for all user_ids from profiles table
      if (reportsWithPatrol.length > 0) {
        await fetchUsernamesAndPatrolOfficerNames(reportsWithPatrol);
      } else {
        setReports(reportsWithPatrol);
        setFilteredReports(reportsWithPatrol);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsernamesAndPatrolOfficerNames = async (reports: ReportWithPatrol[]) => {
    try {
      // Get unique user IDs and patrol user IDs
      const userIds = reports
        .map(report => report.user_id)
        .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

      const patrolUserIds = reports
        .filter(report => report.patrol_user_id)
        .map(report => report.patrol_user_id)
        .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

      let userMap = new Map();
      let patrolUserMap = new Map();

      // Fetch user profiles for usernames
      if (userIds.length > 0) {
        const { data: userProfiles, error: userError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        if (!userError && userProfiles) {
          userProfiles.forEach(profile => {
            userMap.set(profile.id, profile.username);
          });
        }
      }

      // Fetch patrol officer profiles
      if (patrolUserIds.length > 0) {
        const { data: patrolProfiles, error: patrolError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', patrolUserIds);

        if (!patrolError && patrolProfiles) {
          patrolProfiles.forEach(profile => {
            patrolUserMap.set(profile.id, profile.username);
          });
        }
      }

      // Update reports with usernames and patrol officer names
      const updatedReports = reports.map(report => ({
        ...report,
        username: userMap.get(report.user_id) || `User ${report.user_id.slice(0, 8)}`,
        patrol_officer_name: report.patrol_user_id ? patrolUserMap.get(report.patrol_user_id) : undefined
      }));

      setReports(updatedReports);
      setFilteredReports(updatedReports);
    } catch (error) {
      console.error('Error in fetchUsernamesAndPatrolOfficerNames:', error);
      // Fallback: set reports with fallback usernames
      const fallbackReports = reports.map(report => ({
        ...report,
        username: `User ${report.user_id.slice(0, 8)}`,
        patrol_officer_name: undefined
      }));
      setReports(fallbackReports);
      setFilteredReports(fallbackReports);
    }
  };

  useEffect(() => {
    // Filter reports based on search term, category, and active tab
    let filtered = reports;
    
    // Filter by active tab (resolved or rejected)
    filtered = filtered.filter(report => report.status === activeTab);
    
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
  }, [reports, searchTerm, categoryFilter, activeTab]);

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

  // Compute quick category counts for chips based on active tab
  const categoryCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    const tabReports = reports.filter(report => report.status === activeTab);
    tabReports.forEach(r => {
      const key = r.category || 'other';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [reports, activeTab]);

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
    a.download = `${activeTab}-reports-${new Date().toISOString().split('T')[0]}.csv`;
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 supports-[backdrop-filter]:bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
                    <ol className="flex items-center space-x-1">
                      <li>Admin</li>
                      <li className="text-gray-300">/</li>
                      <li className="font-medium text-gray-700">History</li>
                    </ol>
                  </nav>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">Reports History</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <div className="hidden sm:flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
                <div className="w-px h-6 bg-gray-200" />
                <button
                  onClick={printPage}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>
              </div>
              <div className="sm:hidden flex items-center gap-2">
                <button onClick={exportToCSV} className="p-2 bg-white rounded-full border border-gray-200 shadow-sm" aria-label="Export CSV">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={printPage} className="p-2 bg-white rounded-full border border-gray-200 shadow-sm" aria-label="Print">
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('resolved')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'resolved'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>Resolved</span>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full">
                  {reports.filter(r => r.status === 'resolved').length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rejected'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4" />
                <span>Rejected</span>
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {reports.filter(r => r.status === 'rejected').length}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/80 supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
        {/* Quick Category Chips */}
        <div className="mb-6 overflow-x-auto">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm min-w-max">
            {(() => {
              const items: Array<{ key: string; label: string; count: number }> = [];
              const unique = Array.from(categoryCounts.keys());
              const tabReports = reports.filter(report => report.status === activeTab);
              items.push({ key: 'all', label: 'All', count: tabReports.length });
              unique.forEach(key => items.push({ key, label: key.charAt(0).toUpperCase() + key.slice(1), count: categoryCounts.get(key) || 0 }));
              return items.map(({ key, label, count }) => {
                const isActive = categoryFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setCategoryFilter(key)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${isActive ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-transparent text-gray-700 hover:bg-gray-50'}`}
                    aria-pressed={isActive}
                  >
                    <span>{label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{count}</span>
                  </button>
                );
              });
            })()}
          </div>
        </div>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${activeTab === 'resolved' ? 'from-green-500 to-emerald-600' : 'from-red-500 to-red-600'} flex items-center justify-center shadow-lg`}>
                {activeTab === 'resolved' ? <Check className="w-6 h-6 text-white" /> : <XCircle className="w-6 h-6 text-white" />}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total {activeTab === 'resolved' ? 'Resolved' : 'Rejected'}</p>
                <p className="text-3xl font-bold text-gray-900">{reports.filter(r => r.status === activeTab).length}</p>
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
                           reportDate.getFullYear() === now.getFullYear() &&
                           r.status === activeTab;
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
                  {new Set(reports.filter(r => r.status === activeTab).map(r => r.category)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{activeTab === 'resolved' ? 'Resolved' : 'Rejected'} Reports</h2>
                <p className="text-sm text-gray-600 mt-1">Showing {filteredReports.length} of {reports.filter(r => r.status === activeTab).length} {activeTab} reports</p>
              </div>
              <div className="inline-flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 text-sm font-medium ${viewMode === 'cards' ? 'bg-gray-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                  aria-pressed={viewMode === 'cards'}
                  title="Card view"
                >
                  Cards
                </button>
                <div className="w-px h-6 bg-gray-200" />
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 text-sm font-medium ${viewMode === 'table' ? 'bg-gray-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                  aria-pressed={viewMode === 'table'}
                  title="Table view"
                >
                  Table
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
              <p>Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {activeTab === 'resolved' ? <Check className="w-16 h-16 text-gray-300 mx-auto mb-4" /> : <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />}
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeTab} reports found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-gray-600">
                    <th className="px-6 py-3 font-medium">Title</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Priority</th>
                    <th className="px-6 py-3 font-medium">Reporter</th>
                    <th className="px-6 py-3 font-medium">Patrol Officer</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReports.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 max-w-[280px] truncate" title={r.title}>{r.title}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(r.category)}`}>{r.category}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(r.priority)}`}>{r.priority}</span>
                      </td>
                      <td className="px-6 py-3 truncate max-w-[180px]" title={r.username}>{r.username}</td>
                      <td className="px-6 py-3 truncate max-w-[180px]" title={r.patrol_officer_name || 'Not Assigned'}>{r.patrol_officer_name || 'Not Assigned'}</td>
                      <td className="px-6 py-3 whitespace-nowrap" title={formatDate(r.created_at)}>{formatDate(r.created_at)}</td>
                      <td className="px-6 py-3 truncate max-w-[320px]" title={r.location_address}>{r.location_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <article key={report.id} className="group mx-4 sm:mx-6 my-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow bg-white">
                  <div className="px-5 sm:px-6 pt-5">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 mr-auto min-w-0">
                        <span className="block truncate" title={report.title}>{report.title}</span>
                      </h3>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getCategoryColor(report.category)}`}>{report.category.charAt(0).toUpperCase() + report.category.slice(1)}</span>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getPriorityColor(report.priority)}`}>{report.priority.charAt(0).toUpperCase() + report.priority.slice(1)} Priority</span>
                      {report.status === 'rejected' && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">Rejected</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{report.description}</p>
                  </div>
                  <div className="px-5 sm:px-6 pb-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <User2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-500 text-xs uppercase tracking-wide">Reporter</p>
                          <p className="font-medium text-gray-900 truncate" title={report.username}>{report.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-500 text-xs uppercase tracking-wide">Patrol Officer</p>
                          <p className="font-medium text-gray-900 truncate" title={report.patrol_officer_name || 'Not Assigned'}>{report.patrol_officer_name || 'Not Assigned'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-500 text-xs uppercase tracking-wide">Date</p>
                          <p className="font-medium text-gray-900 truncate" title={formatDate(report.created_at)}>{formatDate(report.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-500 text-xs uppercase tracking-wide">Location</p>
                          <p className="font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap" title={report.location_address}>{report.location_address}</p>
                        </div>
                      </div>
                    </div>
                    {report.images && report.images.length > 0 && (
                      <div className="mt-5">
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
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
