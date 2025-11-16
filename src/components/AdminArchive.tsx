import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, RefreshCw, Eye, Trash2, RotateCcw, Archive, Hash, Calendar, MapPin, FileText, User2, ChevronUp, ChevronDown, ChevronsUpDown, X, HelpCircle } from 'lucide-react';
import { getStatusColor as badgeStatusColor, formatStatusForDisplay } from '../lib/badges';
import { reportsService } from '../services/reportsService';
import type { Report } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ConfirmationModal } from './ConfirmationModal';
import { Notification } from './Notification';
import { ImageViewer } from './ImageViewer';
import { FocusTrap } from './FocusTrap';

type SortField = 'case_number' | 'title' | 'status' | 'priority' | 'category' | 'archived_at' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function AdminArchive() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<{ isOpen: boolean; reportId: string | null; reportTitle: string }>({ isOpen: false, reportId: null, reportTitle: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; reportId: string | null; reportTitle: string }>({ isOpen: false, reportId: null, reportTitle: '' });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Table sorting and pagination
  const [sortField, setSortField] = useState<SortField>('archived_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all archived reports
      const { data: reportsData, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('is_archived', true)
        .order('archived_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        return;
      }

      // Fetch user profiles separately
      const userIds = [...new Set([
        ...reportsData.map((r: any) => r.user_id),
        ...reportsData.map((r: any) => r.archived_by).filter(Boolean)
      ])];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map of profiles by ID
      const profilesMap = new Map();
      (profilesData || []).forEach((profile: any) => {
        profilesMap.set(profile.id, profile);
      });

      // Transform the data to match Report interface
      const transformedReports = (reportsData || []).map((r: any) => ({
        ...r,
        user_profile: profilesMap.get(r.user_id) || null,
        archived_by_profile: r.archived_by ? (profilesMap.get(r.archived_by) || null) : null
      }));

      setReports(transformedReports);
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to load archived reports';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Get unique categories and priorities for filters
  const categories = useMemo(() => {
    const cats = new Set(reports.map(r => r.category));
    return Array.from(cats).sort();
  }, [reports]);

  // Filtered reports
  const filtered = useMemo(() => {
    let filtered = reports;

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.case_number?.toLowerCase().includes(query) ||
        r.user_profile?.username?.toLowerCase().includes(query) ||
        r.archive_reason?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    // Priority filter
    if (priorityFilter !== 'All') {
      filtered = filtered.filter(r => r.priority === priorityFilter);
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    return filtered;
  }, [reports, search, categoryFilter, priorityFilter, statusFilter]);

  // Sorted and paginated reports
  const sortedAndPaginated = useMemo(() => {
    let sorted = [...filtered];
    
    // Apply sorting
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'case_number':
          aValue = a.case_number || '';
          bValue = b.case_number || '';
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'archived_at':
          aValue = a.archived_at ? new Date(a.archived_at).getTime() : 0;
          bValue = b.archived_at ? new Date(b.archived_at).getTime() : 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      data: sorted.slice(startIndex, endIndex),
      total: sorted.length,
      totalPages: Math.ceil(sorted.length / itemsPerPage)
    };
  }, [filtered, sortField, sortDirection, currentPage, itemsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = reports.length;
    const last7Days = reports.filter(r => {
      if (!r.archived_at) return false;
      const archivedDate = new Date(r.archived_at);
      const daysAgo = (Date.now() - archivedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    }).length;
    const last30Days = reports.filter(r => {
      if (!r.archived_at) return false;
      const archivedDate = new Date(r.archived_at);
      const daysAgo = (Date.now() - archivedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    }).length;
    
    const byCategory = reports.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, last7Days, last30Days, byCategory };
  }, [reports]);

  const handleRestore = async () => {
    if (!restoreConfirm.reportId || !user) return;
    const reportId = restoreConfirm.reportId;
    
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          is_archived: false,
          archived_at: null,
          archived_by: null,
          archive_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      // Clear the admin reports cache to force refresh
      try {
        sessionStorage.removeItem('admin_map_reports_v1');
        // Also clear any cached admin reports
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith('admin_reports_')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Error clearing cache:', e);
      }

      showNotification('Report restored to active reports successfully', 'success');
      setRestoreConfirm({ isOpen: false, reportId: null, reportTitle: '' });
      await loadReports();
    } catch (e: any) {
      showNotification(e?.message || 'Failed to restore report', 'error');
      setRestoreConfirm({ isOpen: false, reportId: null, reportTitle: '' });
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirm.reportId) return;
    const reportId = deleteConfirm.reportId;
    const reportTitle = deleteConfirm.reportTitle;
    
    try {
      const reportToDelete = reports.find(r => r.id === reportId);
      
      // Optimistically remove from UI
      setReports(prev => prev.filter(r => r.id !== reportId));
      
      // Permanently delete from database
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      
      if (error) {
        // Rollback on error
        if (reportToDelete) {
          setReports(prev => [...prev, reportToDelete]);
        }
        throw error;
      }
      
      showNotification(`Report "${reportTitle}" permanently deleted`, 'success');
      setDeleteConfirm({ isOpen: false, reportId: null, reportTitle: '' });
      await loadReports();
    } catch (e: any) {
      await loadReports();
      showNotification(e?.message || 'Failed to delete report', 'error');
      setDeleteConfirm({ isOpen: false, reportId: null, reportTitle: '' });
    }
  };

  const handleView = (report: Report) => {
    setSelectedReport(report);
    if (report.images && report.images.length > 0) {
      setSelectedImage(report.images[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Archived Reports</h2>
          <p className="text-sm text-gray-600 mt-1">View and manage archived reports</p>
        </div>
        <button
          onClick={loadReports}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Total Archived</div>
          </div>
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 shadow-sm">
            <div className="text-2xl font-bold text-amber-700">{stats.last7Days}</div>
            <div className="text-xs sm:text-sm text-amber-600 mt-1">Last 7 Days</div>
          </div>
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 shadow-sm">
            <div className="text-2xl font-bold text-orange-700">{stats.last30Days}</div>
            <div className="text-xs sm:text-sm text-orange-600 mt-1">Last 30 Days</div>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-700">{Object.keys(stats.byCategory).length}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Categories</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, title, reporter, or archive reason..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
          >
            <option>All</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
          >
            <option>All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
          >
            <option>All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <div>Loading archived reports...</div>
        </div>
      ) : sortedAndPaginated.data.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border border-gray-200">
          <Archive className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <div className="text-gray-500 font-medium">No archived reports found</div>
          <div className="text-sm text-gray-400 mt-1">
            {search || categoryFilter !== 'All' || priorityFilter !== 'All' || statusFilter !== 'All'
              ? 'No archived reports match your search criteria.'
              : 'No archived reports yet. Archived reports will appear here.'}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('case_number')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Report ID</span>
                      {getSortIcon('case_number')}
                    </div>
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Title</span>
                      {getSortIcon('title')}
                    </div>
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Status</span>
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden md:table-cell"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Priority</span>
                      {getSortIcon('priority')}
                    </div>
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden lg:table-cell"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Category</span>
                      {getSortIcon('category')}
                    </div>
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                    Reporter
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Date Reported</span>
                      {getSortIcon('created_at')}
                    </div>
                  </th>
                  <th 
                    className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('archived_at')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Date Archived</span>
                      {getSortIcon('archived_at')}
                    </div>
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAndPaginated.data.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      {r.case_number ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900">
                          <Hash className="w-3.5 h-3.5 text-gray-500" />
                          {r.case_number}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={r.title}>
                        {r.title}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badgeStatusColor(r.status)}`}>
                        {formatStatusForDisplay(r.status)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap hidden md:table-cell">
                      {r.priority && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          r.priority === 'high' 
                            ? 'bg-red-100 text-red-800 border border-red-200' 
                            : r.priority === 'medium' 
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                            : 'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {r.priority === 'high' && '🔴 '}
                          {r.priority === 'medium' && '🟡 '}
                          {r.priority === 'low' && '🟢 '}
                          {r.priority}
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                      <span className="text-sm text-gray-900 capitalize">{r.category}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {r.user_profile?.avatar_url ? (
                          <img 
                            src={r.user_profile.avatar_url} 
                            alt={r.user_profile.username || 'User'} 
                            className="w-6 h-6 rounded-full object-cover border border-gray-200" 
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-semibold text-blue-900">
                            {(r.user_profile?.username || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-gray-900">
                          {r.is_anonymous ? 'Anonymous' : (r.user_profile?.username || 'Unknown')}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(r.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {r.archived_at ? (
                          new Date(r.archived_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
                        <button
                          onClick={() => handleView(r)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-semibold transition-colors"
                          title="View Full Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRestoreConfirm({ isOpen: true, reportId: r.id, reportTitle: r.title })}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white hover:bg-green-700 rounded text-xs font-semibold transition-colors"
                          title="Restore Report"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, reportId: r.id, reportTitle: r.title })}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white hover:bg-red-700 rounded text-xs font-semibold transition-colors"
                          title="Permanently Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {sortedAndPaginated.totalPages > 1 && (
            <div className="bg-gray-50 px-3 sm:px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <span className="text-sm text-gray-700 text-center sm:text-left">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedAndPaginated.total)} of {sortedAndPaginated.total} reports
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {currentPage} of {sortedAndPaginated.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(sortedAndPaginated.totalPages, prev + 1))}
                    disabled={currentPage === sortedAndPaginated.totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedReport(null)} />
          <div className="absolute inset-0 px-2 sm:px-4 flex items-start sm:items-center justify-center py-6 sm:py-10">
            <FocusTrap>
            <div className="w-full max-w-full sm:max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="text-xl font-semibold text-gray-900 truncate">{selectedReport.title}</h3>
                  {selectedReport.case_number && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                      <Hash className="h-3.5 w-3.5" />
                      <span>Case #{selectedReport.case_number}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Body */}
              <div className="px-4 sm:px-6 py-5 space-y-5 overflow-y-auto">
                {/* Description */}
                <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Description</div>
                  <p className="text-base text-gray-800 leading-relaxed">{selectedReport.description}</p>
                </div>

                {/* Archive Information */}
                {selectedReport.archived_at && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Archive className="w-4 h-4 text-amber-600" />
                      <div className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Archive Information</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-amber-700 font-medium">Archived On</div>
                        <div className="text-amber-900">
                          {new Date(selectedReport.archived_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      {selectedReport.archive_reason && (
                        <div>
                          <div className="text-amber-700 font-medium">Archive Reason</div>
                          <div className="text-amber-900">{selectedReport.archive_reason}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Two-column info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Category</div>
                    <div className="mt-1 text-sm text-gray-800">{selectedReport.category}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
                    <div className="mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badgeStatusColor(selectedReport.status)}`}>
                        {formatStatusForDisplay(selectedReport.status)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Reported By</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-800">
                      {selectedReport.user_profile?.avatar_url ? (
                        <img src={selectedReport.user_profile.avatar_url} alt={selectedReport.user_profile.username || 'User'} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
                          {(selectedReport.user_profile?.username || 'U').slice(0,1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div>{selectedReport.is_anonymous ? 'Anonymous' : (selectedReport.user_profile?.username || 'Unknown')}</div>
                        <div className="text-xs text-gray-500">{new Date(selectedReport.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Reported Date</div>
                    <div className="mt-1 text-sm text-gray-800">
                      {new Date(selectedReport.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Images */}
                {selectedReport.images && selectedReport.images.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Images</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedReport.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Report image ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage(img)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div className="px-4 sm:px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setRestoreConfirm({ isOpen: true, reportId: selectedReport.id, reportTitle: selectedReport.title })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore Report
                </button>
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, reportId: selectedReport.id, reportTitle: selectedReport.title })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Permanently Delete
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
            </FocusTrap>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {selectedImage && (
        <ImageViewer
          images={selectedReport?.images || [selectedImage]}
          initialIndex={selectedReport?.images?.indexOf(selectedImage) || 0}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={restoreConfirm.isOpen}
        onClose={() => setRestoreConfirm({ isOpen: false, reportId: null, reportTitle: '' })}
        onConfirm={handleRestore}
        title="Restore Report"
        message={`Are you sure you want to restore "${restoreConfirm.reportTitle}" to active reports?`}
        confirmText="Restore"
        cancelText="Cancel"
        type="info"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, reportId: null, reportTitle: '' })}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete Report"
        message={`Are you sure you want to permanently delete "${deleteConfirm.reportTitle}"? This action cannot be undone and will permanently remove the report from the system.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        type="danger"
      />

      {/* Notification */}
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

