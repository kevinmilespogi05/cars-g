import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, CheckCircle2, XCircle, Wrench, RefreshCw, Eye, Trash2, User2, Calendar, MapPin, X, Navigation, Hash, CalendarDays, FileText, Download, HelpCircle, Edit2 } from 'lucide-react';
import { getStatusColor as badgeStatusColor, formatStatusForDisplay } from '../lib/badges';
import { reportsService } from '../services/reportsService';
import type { Report } from '../types';
import { supabase } from '../lib/supabase';
import { FocusTrap } from './FocusTrap';
import { awardPoints, awardCustomPoints } from '../lib/points';
import { caseService } from '../services/caseService';
import { CommentsService } from '../services/commentsService';
import { ConfirmationModal } from './ConfirmationModal';
import { Notification } from './Notification';
import { useToastContext } from '../contexts/ToastContext';
import { getReportCoordinates, isValidCoordinates } from '../lib/geocoding';

type StatusFilter = 'All' | 'verifying' | 'pending' | 'in_progress' | 'resolved' | 'declined';

export function AdminReports() {
  const navigate = useNavigate();
  const { success: showToastSuccess, error: showToastError, info: showToastInfo } = useToastContext();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const loadingRef = React.useRef(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' }>>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; reportId: string | null; reportTitle: string }>({ isOpen: false, reportId: null, reportTitle: '' });
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ title: string; description: string; category: string; priority: 'low' | 'medium' | 'high' }>({ title: '', description: '', category: '', priority: 'medium' });
  const [editFormErrors, setEditFormErrors] = useState<{ title?: string; description?: string; category?: string }>({});
  const [saving, setSaving] = useState(false);

  // Notification queue management
  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    setNotificationQueue(prev => {
      const newQueue = [...prev, { id, message, type }];
      // Show first notification if queue was empty
      if (prev.length === 0) {
        setNotification({ message, type });
      }
      return newQueue;
    });
  };

  const removeNotification = (id: string) => {
    setNotificationQueue(prev => {
      const newQueue = prev.filter(n => n.id !== id);
      // Show next notification if available
      if (newQueue.length > 0) {
        const next = newQueue[0];
        setNotification({ message: next.message, type: next.type });
      } else {
        setNotification(null);
      }
      return newQueue;
    });
  };

  const loadReports = useCallback(async () => {
    if (loadingRef.current) return; // prevent overlap
    setLoading(true);
    loadingRef.current = true;
    setError(null);
    try {
      // Instant paint from cache if available
      try {
        const raw = sessionStorage.getItem('admin_map_reports_v1');
        if (raw) {
          const cached = JSON.parse(raw);
          if (Array.isArray(cached?.data)) setReports(cached.data);
        }
      } catch {}

      const data = await reportsService.getAdminReports({
        search: search || undefined,
        status,
        limit: 30,
      } as any);
      setReports(data);
      // Show info if no reports found
      if (data.length === 0 && !loading) {
        showToastInfo(`No reports found with status: ${status === 'All' ? 'all statuses' : status}`, 3000);
      }
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to load reports';
      setError(errorMsg);
      showToastError(errorMsg, 5000);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [search, status]);

  useEffect(() => {
    // initial load
    loadReports();
  }, []);

  // Debounced fetch for search only
  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Immediate fetch when status changes
  useEffect(() => {
    loadReports();
  }, [status]);

  const filtered = useMemo(() => reports, [reports]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = reports.length;
    const byStatus = reports.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const byPriority = reports.reduce((acc, r) => {
      if (r.priority) acc[r.priority] = (acc[r.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const highPriority = byPriority.high || 0;
    const inProgress = byStatus.in_progress || 0;
    const pending = byStatus.pending || 0;
    const resolved = byStatus.resolved || 0;
    
    return {
      total,
      pending,
      inProgress,
      resolved,
      highPriority,
      byStatus,
      byPriority
    };
  }, [reports]);

  const givePatrolRewards = async (patrolUserId: string, priority: string) => {
    try {
      // Align patrol reward points with patrol experience mapping
      // low:10, medium:25, high:50
      const points = priority === 'high' ? 50 : priority === 'medium' ? 25 : 10;

      // Use unified points system so profile "Total Points" stays consistent
      await awardCustomPoints(patrolUserId, points, 'PATROL_RESOLVED');

      console.log(`Patrol officer rewarded: +${points} points`);
    } catch (error) {
      console.error('Error giving patrol rewards:', error);
    }
  };

  const giveReporterRewards = async (reporterUserId: string, reportId: string) => {
    try {
      // Award points to the reporter using the existing points system
      const pointsAwarded = await awardPoints(reporterUserId, 'REPORT_RESOLVED', reportId);
      
      console.log(`Reporter rewarded: +${pointsAwarded} points`);

    } catch (error) {
      console.error('Error giving reporter rewards:', error);
    }
  };

  const [dispatchGroup, setDispatchGroup] = useState<Record<string, Report['assigned_group']>>({});
  const [dispatchAssignee, setDispatchAssignee] = useState<Record<string, string>>({});
  const [dispatchResponsibility, setDispatchResponsibility] = useState<Record<string, string>>({});
  const now = new Date();
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [monthValue, setMonthValue] = useState<string>(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [yearValue, setYearValue] = useState<number>(() => now.getFullYear());

  // Simple CSV export for reporting
  const exportReportsCsv = (items: Report[], filename: string) => {
    const col = [
      'id',
      'case_number',
      'title',
      'description',
      'category',
      'status',
      'priority',
      'priority_level',
      'assigned_group',
      'assigned_patroller_name',
      'location_address',
      'created_at',
      'updated_at',
      'reporter_username',
      'likes_count',
      'comments_count',
      'rating_avg',
      'rating_count',
    ] as const;
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = col.join(',');
    const rows = items.map((r: any) => {
      const likeCount = Array.isArray(r.likes)
        ? (r.likes[0]?.count || 0)
        : (typeof r.likes === 'number' ? r.likes : 0);
      const legacyComments = Array.isArray(r.comments) ? (r.comments[0]?.count || 0) : 0;
      const newComments = Array.isArray(r.comment_count) ? (r.comment_count[0]?.count || 0) : 0;
      const totalComments = legacyComments + newComments;
      const row: Record<string,string|number|null|undefined> = {
        id: r.id,
        case_number: r.case_number,
        title: r.title,
        description: r.description,
        category: r.category,
        status: r.status,
        priority: r.priority,
        priority_level: r.priority_level,
        assigned_group: r.assigned_group,
        assigned_patroller_name: r.assigned_patroller_name,
        location_address: r.location_address,
        created_at: r.created_at,
        updated_at: (r as any).updated_at,
        reporter_username: r.user_profile?.username,
        likes_count: likeCount,
        comments_count: totalComments,
        rating_avg: (r as any).rating_avg,
        rating_count: (r as any).rating_count,
      };
      return col.map(k => escape((row as any)[k])).join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDispatch = async (reportId: string) => {
    const group = dispatchGroup[reportId] || 'Other';
    const assignee = dispatchAssignee[reportId] || '';
    const responsibility = dispatchResponsibility[reportId] || '';
    try {
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, assigned_group: group, assigned_patroller_name: assignee, status: 'in_progress' } : r));
      await reportsService.updateReportTicketing(reportId, {
        assigned_group: group as any,
        assigned_patroller_name: assignee || undefined,
      } as any);
      await reportsService.updateReportStatus(reportId, 'in_progress');
      // Log assignment responsibility as a status update comment if provided
      if (responsibility) {
        try {
          await CommentsService.addComment(reportId, `Assigned to ${group}${assignee ? ` (${assignee})` : ''} · Task: ${responsibility}`, 'assignment');
        } catch {}
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to dispatch');
      await loadReports();
    }
  };

  const updateStatus = async (reportId: string, newStatus: Report['status']) => {
    setStatusUpdateLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      // Get the current report to check status transitions
      const currentReport = reports.find(r => r.id === reportId);
      if (!currentReport) {
        throw new Error('Report not found');
      }

      // Validate status transition
      const validTransitions: Record<Report['status'], Report['status'][]> = {
        'verifying': ['pending', 'declined'],
        'pending': ['in_progress', 'declined', 'verifying'],
        'in_progress': ['resolved', 'pending', 'declined'],
        'resolved': ['in_progress', 'pending'], // Allow reopening resolved reports
        'declined': ['pending', 'verifying'], // Allow reopening declined reports
        'awaiting_verification': ['pending', 'declined'],
        'cancelled': ['pending', 'verifying']
      };

      const allowedTransitions = validTransitions[currentReport.status] || [];
      if (!allowedTransitions.includes(newStatus)) {
        showNotification(
          `Cannot transition from "${formatStatusForDisplay(currentReport.status)}" to "${formatStatusForDisplay(newStatus)}". Valid transitions: ${allowedTransitions.join(', ')}.`,
          'error'
        );
        setStatusUpdateLoading(prev => ({ ...prev, [reportId]: false }));
        return;
      }

      const isCompletingReport = currentReport.status === 'in_progress' && newStatus === 'resolved';

      // If completing a report (moving from in_progress to resolved), give rewards to both patrol officer and reporter
      if (isCompletingReport) {
        // Give rewards to patrol officer if assigned
        if (currentReport.patrol_user_id) {
          await givePatrolRewards(currentReport.patrol_user_id, currentReport.priority);
        }
        
        // Give rewards to the reporter
        await giveReporterRewards(currentReport.user_id, reportId);
      }

      // Optimistically update UI (immediate feedback)
      const previousStatus = currentReport.status;
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      
      // Update in database
      try {
        await reportsService.updateReportStatus(reportId, newStatus);
      } catch (dbError) {
        // Rollback optimistic update on error
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: previousStatus } : r));
        throw dbError;
      }
      
      // Show success notification
      showNotification(
        `Report status updated from "${formatStatusForDisplay(currentReport.status)}" to "${formatStatusForDisplay(newStatus)}" successfully.`,
        'success'
      );
      
      // Auto-refresh after a short delay to ensure consistency
      setTimeout(() => {
        loadReports();
      }, 1000);
    } catch (e: any) {
      // Show error notification
      showNotification(
        e?.message || 'Failed to update report status. Please try again.',
        'error'
      );
      // Revert optimistic update on failure
      await loadReports();
    } finally {
      setStatusUpdateLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handleView = (report: Report) => {
    setSelectedReport(report);
    setIsEditing(false);
    setEditForm({
      title: report.title,
      description: report.description,
      category: report.category,
      priority: report.priority || 'medium'
    });
  };

  const handleEdit = () => {
    if (selectedReport) {
      setIsEditing(true);
      setEditForm({
        title: selectedReport.title,
        description: selectedReport.description,
        category: selectedReport.category,
        priority: selectedReport.priority || 'medium'
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormErrors({});
    if (selectedReport) {
      setEditForm({
        title: selectedReport.title,
        description: selectedReport.description,
        category: selectedReport.category,
        priority: selectedReport.priority || 'medium'
      });
    }
  };

  const validateEditForm = (): boolean => {
    const errors: { title?: string; description?: string; category?: string } = {};
    
    if (!editForm.title.trim()) {
      errors.title = 'Title is required';
    } else if (editForm.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (editForm.title.trim().length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }
    
    if (!editForm.description.trim()) {
      errors.description = 'Description is required';
    } else if (editForm.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (editForm.description.trim().length > 5000) {
      errors.description = 'Description must be less than 5000 characters';
    }
    
    if (!editForm.category.trim()) {
      errors.category = 'Category is required';
    } else if (editForm.category.trim().length < 2) {
      errors.category = 'Category must be at least 2 characters';
    } else if (editForm.category.trim().length > 100) {
      errors.category = 'Category must be less than 100 characters';
    }
    
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!selectedReport) return;
    
    // Validate form
    if (!validateEditForm()) {
      showNotification(
        'Please fix the errors in the form before saving.',
        'error'
      );
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          category: editForm.category.trim(),
          priority: editForm.priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      // Update local state
      setReports(prev => prev.map(r => 
        r.id === selectedReport.id 
          ? { ...r, title: editForm.title.trim(), description: editForm.description.trim(), category: editForm.category.trim(), priority: editForm.priority }
          : r
      ));
      
      setSelectedReport({
        ...selectedReport,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category.trim(),
        priority: editForm.priority
      });

      setIsEditing(false);
      setEditFormErrors({});
      showNotification(
        'Report updated successfully.',
        'success'
      );
      
      // Refresh reports to ensure consistency
      setTimeout(() => {
        loadReports();
      }, 500);
    } catch (e: any) {
      showNotification(
        e?.message || 'Failed to update report. Please try again.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (reportId: string, reportTitle: string) => {
    setDeleteConfirm({ isOpen: true, reportId, reportTitle });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.reportId) return;
    const reportId = deleteConfirm.reportId;
    const reportTitle = deleteConfirm.reportTitle;
    
    try {
      // Store deleted report for potential rollback
      const deletedReport = reports.find(r => r.id === reportId);
      
      // Optimistically remove from UI (immediate feedback)
      setReports(prev => prev.filter(r => r.id !== reportId));
      
      // Delete from database
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      if (error) {
        // Rollback optimistic update on error
        if (deletedReport) {
          setReports(prev => [...prev, deletedReport].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
        }
        throw error;
      }
      
      showNotification(
        `Report "${reportTitle}" deleted successfully.`,
        'success'
      );
      
      setDeleteConfirm({ isOpen: false, reportId: null, reportTitle: '' });
      
      // Refresh reports to update statistics
      await loadReports();
    } catch (e: any) {
      // Rollback optimistic update on error (already handled above, but refresh to ensure consistency)
      await loadReports();
      showNotification(
        e?.message || 'Failed to delete report. Please try again.',
        'error'
      );
      setDeleteConfirm({ isOpen: false, reportId: null, reportTitle: '' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
            <span className="ml-2 text-xs text-gray-500 font-normal">(Title, description, or reporter name)</span>
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by title, description, or reporter name..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              aria-label="Search reports"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option>All</option>
            <option value="verifying">Verifying</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="declined">Declined</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              try { sessionStorage.removeItem('admin_map_reports_v1'); } catch {}
              loadReports();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="relative group">
            <button
              onClick={async () => {
                setShowMonthPicker(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              title="Export Monthly Report - Generate and download a CSV report for a specific month"
              aria-label="Export monthly report"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Monthly</span>
              <span className="sm:hidden">Month</span>
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                Export Monthly Report - Generate and download a CSV report for a specific month
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          <div className="relative group">
            <button
              onClick={async () => {
                setShowYearPicker(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              title="Export Yearly Report - Generate and download a CSV report for a specific year"
              aria-label="Export yearly report"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Yearly</span>
              <span className="sm:hidden">Year</span>
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                Export Yearly Report - Generate and download a CSV report for a specific year
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMonthPicker(false)} />
          <div className="absolute inset-0 px-4 flex items-center justify-center py-8">
            <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Export Monthly Report</h3>
              <label className="block text-xs text-gray-600 mb-1">Select month</label>
              <input
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowMonthPicker(false)} className="px-3 py-1.5 text-sm rounded border border-gray-300">Cancel</button>
                <button
                  onClick={async () => {
                    const [yStr, mStr] = (monthValue || '').split('-');
                    const year = Number(yStr || now.getFullYear());
                    const month = Number((mStr || String(now.getMonth() + 1)).padStart(2, '0'));
                    try {
                      const all = await caseService.getMonthlyCases(year, month, status);
                      if (!all || all.length === 0) {
                        showNotification(
                          `No reports found for ${new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' })} ${year}.`,
                          'warning'
                        );
                        setShowMonthPicker(false);
                        return;
                      }
                      await caseService.generateMonthly(year, month);
                      const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
                      const statusText = status === 'All' ? 'All' : status;
                      exportReportsCsv(all as any, `${monthName}, ${year} - ${statusText} report.csv`);
                      showNotification(
                        `Monthly report exported successfully. ${all.length} report(s) included.`,
                        'success'
                      );
                      setShowMonthPicker(false);
                    } catch (e: any) {
                      showNotification(
                        e?.message || 'Failed to export monthly report. Please try again.',
                        'error'
                      );
                    }
                  }}
                  className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Year Picker Modal */}
      {showYearPicker && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowYearPicker(false)} />
          <div className="absolute inset-0 px-4 flex items-center justify-center py-8">
            <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Export Yearly Report</h3>
              <label className="block text-xs text-gray-600 mb-1">Select year</label>
              <input
                type="number"
                min={2000}
                max={9999}
                value={yearValue}
                onChange={(e) => setYearValue(Number(e.target.value) || now.getFullYear())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowYearPicker(false)} className="px-3 py-1.5 text-sm rounded border border-gray-300">Cancel</button>
                <button
                  onClick={async () => {
                    const year = yearValue || now.getFullYear();
                    try {
                      const all = await caseService.getYearlyCases(year, status);
                      if (!all || all.length === 0) {
                        showNotification(
                          `No reports found for year ${year}.`,
                          'warning'
                        );
                        setShowYearPicker(false);
                        return;
                      }
                      await caseService.generateYearly(year);
                      const statusText = status === 'All' ? 'All' : status;
                      exportReportsCsv(all as any, `${year} - ${statusText} report.csv`);
                      showNotification(
                        `Yearly report exported successfully. ${all.length} report(s) included.`,
                        'success'
                      );
                      setShowYearPicker(false);
                    } catch (e: any) {
                      showNotification(
                        e?.message || 'Failed to export yearly report. Please try again.',
                        'error'
                      );
                    }
                  }}
                  className="px-3 py-1.5 text-sm rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
      )}

      {/* Summary Statistics */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative group cursor-help">
            <div className="text-2xl font-bold text-gray-900">{summaryStats.total}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1 flex items-center gap-1">
              Total Reports
              <HelpCircle className="w-3 h-3 text-gray-400" />
            </div>
            <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                Total reports matching current filters
                <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 shadow-sm relative group cursor-help">
            <div className="text-2xl font-bold text-yellow-700">{summaryStats.pending}</div>
            <div className="text-xs sm:text-sm text-yellow-600 mt-1 flex items-center gap-1">
              Pending
              <HelpCircle className="w-3 h-3 text-yellow-400" />
            </div>
            <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                Reports awaiting review
                <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 shadow-sm relative group cursor-help">
            <div className="text-2xl font-bold text-blue-700">{summaryStats.inProgress}</div>
            <div className="text-xs sm:text-sm text-blue-600 mt-1 flex items-center gap-1">
              In Progress
              <HelpCircle className="w-3 h-3 text-blue-400" />
            </div>
            <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                Reports currently being handled
                <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 shadow-sm relative group cursor-help">
            <div className="text-2xl font-bold text-green-700">{summaryStats.resolved}</div>
            <div className="text-xs sm:text-sm text-green-600 mt-1 flex items-center gap-1">
              Resolved
              <HelpCircle className="w-3 h-3 text-green-400" />
            </div>
            <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                Reports successfully completed
                <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4 shadow-sm relative group cursor-help">
            <div className="text-2xl font-bold text-red-700">{summaryStats.highPriority}</div>
            <div className="text-xs sm:text-sm text-red-600 mt-1 flex items-center gap-1">
              High Priority
              <HelpCircle className="w-3 h-3 text-red-400" />
            </div>
            <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                High priority reports requiring urgent attention
                <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Grid - Two Column Card Layout */}
      {loading ? (
        <div className="p-12 text-center text-gray-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <div>Loading reports...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <div className="text-gray-500 font-medium">No reports found</div>
          <div className="text-sm text-gray-400 mt-1">
            {search 
              ? `No reports match "${search}". Try adjusting your search terms or filters.`
              : `No reports found with status "${status}". Try selecting a different status filter.`
            }
          </div>
          {(search || status !== 'All') && (
            <button
              onClick={() => {
                setSearch('');
                setStatus('All');
              }}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filtered.map((r) => {
            // Truncate description for card view
            const truncatedDescription = r.description.length > 150 
              ? r.description.substring(0, 150) + '...' 
              : r.description;
            
            return (
              <div key={r.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                {/* Card Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-2 line-clamp-2">
                        {r.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badgeStatusColor(r.status)}`}>
                          {formatStatusForDisplay(r.status)}
                        </span>
                        {/* Priority Badge */}
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
                            {r.priority} Priority
                          </span>
                        )}
                        {/* Case Number */}
                        {r.case_number && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            <Hash className="h-3 w-3 mr-1" />
                            {r.case_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                    {truncatedDescription}
                  </p>
                </div>

                {/* Card Body - Two Column Layout for Meta Info */}
                <div className="p-4 sm:p-5 bg-gray-50 border-b border-gray-100">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Reporter */}
                    <div className="flex items-center gap-2">
                      {r.user_profile?.avatar_url ? (
                        <img 
                          src={r.user_profile.avatar_url} 
                          alt={r.user_profile.username || 'User'} 
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-gray-200" 
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                          <User2 className="w-3.5 h-3.5 text-gray-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">Reporter</div>
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {r.user_profile?.username || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Date */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">Reported</div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(r.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Category */}
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">Category</div>
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {r.category}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    {r.location_address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500">Location</div>
                          <div className="text-sm font-medium text-gray-900 truncate" title={r.location_address}>
                            {r.location_address.length > 25 
                              ? r.location_address.substring(0, 25) + '...' 
                              : r.location_address}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Assigned Group */}
                    {r.assigned_group && (
                      <div className="col-span-2 flex items-center gap-2">
                        <User2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500">Assigned To</div>
                          <div className="text-sm font-medium text-blue-700">
                            {r.assigned_group}
                            {r.assigned_patroller_name && ` • ${r.assigned_patroller_name}`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer - Quick Actions */}
                <div className="p-4 sm:p-5 bg-white">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Status Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(['pending','in_progress','resolved','declined'] as const)
                        .filter(target => {
                          // Show only valid transitions based on current status
                          if (target === r.status) return false;
                          
                          // Define valid transitions (prevents invalid status changes)
                          const validTransitions: Record<Report['status'], Report['status'][]> = {
                            'verifying': ['pending', 'declined'],
                            'pending': ['in_progress', 'declined', 'verifying'],
                            'in_progress': ['resolved', 'pending', 'declined'],
                            'resolved': ['in_progress', 'pending'], // Allow reopening resolved reports
                            'declined': ['pending', 'verifying'], // Allow reopening declined reports
                            'awaiting_verification': ['pending', 'declined'],
                            'cancelled': ['pending', 'verifying']
                          };
                          
                          const allowedTransitions = validTransitions[r.status] || [];
                          // Only show buttons for valid transitions
                          return allowedTransitions.includes(target);
                        })
                        .slice(0, 2) // Show max 2 status buttons in card view
                        .map(target => (
                          <button
                            key={target}
                            onClick={() => updateStatus(r.id, target)}
                            disabled={statusUpdateLoading[r.id]}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              target === 'pending'
                                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                                : target === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                : target === 'resolved'
                                ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            }`}
                            title={`Mark as ${target.replace('_', ' ')}`}
                          >
                            {statusUpdateLoading[r.id] ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : target === 'resolved' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : target === 'declined' ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : (
                              <Wrench className="w-3.5 h-3.5" />
                            )}
                            {target === 'pending' ? 'Pending' : target === 'in_progress' ? 'In Progress' : target === 'resolved' ? 'Resolve' : 'Decline'}
                          </button>
                        ))}
                    </div>

                    {/* View & Delete Actions - Separated with more spacing */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleView(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 text-xs font-medium transition-colors"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <button
                        onClick={() => handleDeleteClick(r.id, r.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg border border-red-200 text-xs font-medium transition-colors"
                        title="Delete Report (cannot be undone)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isEditing && (
                    <button
                      onClick={handleEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-medium transition-colors"
                      title="Edit Report"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  )}
                  <Link
                    to={`/reports/${selectedReport.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-medium transition-colors"
                    title="Open Full Page"
                    onClick={(e) => {
                      // Open in new tab to preserve current page state
                      e.preventDefault();
                      window.open(`/reports/${selectedReport.id}`, '_blank');
                    }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Full Page</span>
                  </Link>
                  <button
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                    aria-label="Close"
                    onClick={() => {
                      setSelectedReport(null);
                      setIsEditing(false);
                    }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Body */}
              <div className="px-4 sm:px-6 py-5 space-y-5 overflow-y-auto">
                {isEditing ? (
                  /* Edit Form */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">
                        Title <span className="text-red-500 font-bold" title="Required field">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditForm(prev => ({ ...prev, title: value }));
                          // Clear error immediately when user starts typing
                          if (editFormErrors.title) {
                            setEditFormErrors(prev => ({ ...prev, title: undefined }));
                          }
                          // Real-time validation feedback (optional - just clear errors)
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                          editFormErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Report title"
                        maxLength={200}
                      />
                      {editFormErrors.title && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{editFormErrors.title}</p>
                      )}
                      <div className="mt-1 flex items-center justify-between">
                        <p className={`text-xs font-medium ${
                          editForm.title.length > 200 
                            ? 'text-red-600' 
                            : editForm.title.length > 180 
                            ? 'text-yellow-600' 
                            : 'text-gray-500'
                        }`}>
                          {editForm.title.length} / 200 characters
                        </p>
                        {editForm.title.length > 200 && (
                          <span className="text-xs text-red-600 font-medium">Character limit exceeded</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">
                        Description <span className="text-red-500 font-bold" title="Required field">*</span>
                      </label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditForm(prev => ({ ...prev, description: value }));
                          // Clear error immediately when user starts typing
                          if (editFormErrors.description) {
                            setEditFormErrors(prev => ({ ...prev, description: undefined }));
                          }
                          // Real-time validation feedback
                        }}
                        maxLength={5000}
                        rows={6}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                          editFormErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Report description"
                      />
                      {editFormErrors.description && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{editFormErrors.description}</p>
                      )}
                      <div className="mt-1 flex items-center justify-between">
                        <p className={`text-xs font-medium ${
                          editForm.description.length > 5000 
                            ? 'text-red-600' 
                            : editForm.description.length > 4500 
                            ? 'text-yellow-600' 
                            : 'text-gray-500'
                        }`}>
                          {editForm.description.length} / 5000 characters
                        </p>
                        {editForm.description.length > 5000 && (
                          <span className="text-xs text-red-600 font-medium">Character limit exceeded</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">
                          Category <span className="text-red-500 font-bold" title="Required field">*</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.category}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditForm(prev => ({ ...prev, category: value }));
                            // Clear error immediately when user starts typing
                            if (editFormErrors.category) {
                              setEditFormErrors(prev => ({ ...prev, category: undefined }));
                            }
                            // Real-time validation feedback
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                            editFormErrors.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="Category"
                          maxLength={100}
                        />
                        {editFormErrors.category && (
                          <p className="mt-1 text-xs text-red-600 font-medium">{editFormErrors.category}</p>
                        )}
                        <p className={`mt-1 text-xs font-medium ${
                          editForm.category.length > 100 
                            ? 'text-red-600' 
                            : editForm.category.length > 90 
                            ? 'text-yellow-600' 
                            : 'text-gray-500'
                        }`}>
                          {editForm.category.length} / 100 characters
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">Priority</label>
                        <select
                          value={editForm.priority}
                          onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Description */}
                    <p className="text-base text-gray-800 leading-relaxed">{selectedReport.description}</p>

                    {/* Two-column info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500">Category</div>
                        <div className="mt-1 text-sm text-gray-800">{selectedReport.category}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500">Priority</div>
                        <div className="mt-1">
                          <span className={`${selectedReport.priority === 'high' ? 'bg-red-100 text-red-800' : selectedReport.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'} text-xs px-2 py-0.5 rounded-full`}>{selectedReport.priority}</span>
                        </div>
                      </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
                    <div className="mt-1">
                      <span className={`${selectedReport.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : selectedReport.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : selectedReport.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs px-2 py-0.5 rounded-full`}>{formatStatusForDisplay(selectedReport.status)}</span>
                    </div>
                  </div>
                  {selectedReport.case_number && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Case Number</div>
                      <div className="mt-1 flex items-center text-sm text-gray-800">
                        <Hash className="h-4 w-4 mr-1" />
                        {selectedReport.case_number}
                      </div>
                    </div>
                  )}
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
                        <div>{selectedReport.user_profile?.username || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{new Date(selectedReport.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
                  </>
                )}

                {/* Location */}
                {selectedReport.location_address && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Location</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-800">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span>{selectedReport.location_address}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          // Detect platform and use appropriate navigation method
                          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                          const isAndroid = /Android/.test(navigator.userAgent);
                          
                          const destination = selectedReport.location_address || '';
                          
                          // Create navigation URLs for different platforms
                          let navigationUrl = '';
                          
                          if (isIOS) {
                            // iOS: Use Apple Maps or Google Maps app
                            navigationUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
                          } else if (isAndroid) {
                            // Android: Try Google Maps app with intent
                            navigationUrl = `intent://maps.google.com/maps?daddr=${encodeURIComponent(destination)}&dirflg=d#Intent;scheme=https;package=com.google.android.apps.maps;end`;
                          } else {
                            // Desktop/Web: Use Google Maps web with navigation mode
                            navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate&nav=1`;
                          }
                          
                          // Open the appropriate navigation URL
                          if (isAndroid) {
                            // For Android, try to open the app, fallback to web
                            try {
                              window.location.href = navigationUrl;
                              // Fallback to web version
                              setTimeout(() => {
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate&nav=1`, '_blank');
                              }, 2000);
                            } catch (error) {
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate&nav=1`, '_blank');
                            }
                          } else {
                            // For iOS and desktop, open directly
                            window.open(navigationUrl, '_blank');
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                      >
                        <Navigation className="w-3 h-3" />
                        Navigate to Location
                      </button>
                      <button
                        onClick={async () => {
                          // Try to get coordinates (with geocoding fallback if needed)
                          const coords = await getReportCoordinates(selectedReport);
                          
                          if (coords) {
                            const params = new URLSearchParams({
                              lat: coords.lat.toString(),
                              lng: coords.lng.toString(),
                              reportId: selectedReport.id,
                              zoom: '16'
                            });
                            navigate(`/admin/map?${params.toString()}`);
                          } else {
                            // If geocoding also failed, show error message
                            showToastError('Unable to determine location coordinates. Please ensure the report has a valid address or coordinates.', 5000);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!isValidCoordinates(selectedReport.location_lat, selectedReport.location_lng) && !selectedReport.location_address 
                          ? 'Location coordinates are missing. Geocoding will be attempted from address.' 
                          : 'Open this report location in the map view'}
                      >
                        <MapPin className="w-3 h-3" />
                        Open in Maps
                      </button>
                    </div>
                  </div>
                )}

                {/* Images */}
                {Array.isArray(selectedReport.images) && selectedReport.images.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Images</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedReport.images.map((src, idx) => (
                        <img key={idx} src={src} alt={`Report image ${idx+1}`} className="w-full h-56 sm:h-64 md:h-72 object-cover rounded-lg border" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t flex flex-wrap items-center justify-end gap-3 sticky bottom-0 bg-white">
                {isEditing && (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </>
                )}
                {/* Dispatch controls */}
                <div className="mr-auto flex items-center gap-2 flex-wrap">
                  <select
                    value={dispatchGroup[selectedReport.id] || selectedReport.assigned_group || ''}
                    onChange={(e) => setDispatchGroup(prev => ({ ...prev, [selectedReport.id]: e.target.value as Report['assigned_group'] }))}
                    className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select group</option>
                    <option>Waste Management</option>
                    <option>Barangay Police</option>
                    <option>Engineering Group</option>
                    <option>Field Group</option>
                    <option>Maintenance Group</option>
                    <option>Other</option>
                  </select>
                  {/* Responsibility selector varies by group */}
                  <select
                    value={dispatchResponsibility[selectedReport.id] || ''}
                    onChange={(e) => setDispatchResponsibility(prev => ({ ...prev, [selectedReport.id]: e.target.value }))}
                    className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select responsibility</option>
                    {(dispatchGroup[selectedReport.id] === 'Waste Management') && (
                      <>
                        <option>Garbage collection</option>
                        <option>Other waste-related concerns</option>
                      </>
                    )}
                    {(dispatchGroup[selectedReport.id] === 'Barangay Police') && (
                      <>
                        <option>Conduct investigations within barangay</option>
                        <option>Respond to presence-required case</option>
                      </>
                    )}
                    {(dispatchGroup[selectedReport.id] === 'Engineering Group') && (
                      <>
                        <option>Repair roads</option>
                        <option>Other engineering-related works</option>
                      </>
                    )}
                    {(!dispatchGroup[selectedReport.id] || ['Field Group','Maintenance Group','Other'].includes(dispatchGroup[selectedReport.id]!)) && (
                      <>
                        <option>Initial assessment</option>
                        <option>Follow-up visit</option>
                      </>
                    )}
                  </select>
                  <input
                    value={dispatchAssignee[selectedReport.id] ?? selectedReport.assigned_patroller_name ?? ''}
                    onChange={(e) => setDispatchAssignee(prev => ({ ...prev, [selectedReport.id]: e.target.value }))}
                    placeholder="Assignee name or user"
                    className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                  />
                  {/* Quick assign shortcuts */}
                  <button
                    onClick={() => setDispatchGroup(prev => ({ ...prev, [selectedReport.id]: 'Waste Management' }))}
                    className="px-2 py-1 text-xs border border-green-200 text-green-700 bg-green-50 rounded hover:bg-green-100"
                    title="Assign Waste Management"
                  >WM</button>
                  <button
                    onClick={() => setDispatchGroup(prev => ({ ...prev, [selectedReport.id]: 'Barangay Police' }))}
                    className="px-2 py-1 text-xs border border-blue-200 text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                    title="Assign Barangay Police"
                  >BP</button>
                  <button
                    onClick={() => setDispatchGroup(prev => ({ ...prev, [selectedReport.id]: 'Engineering Group' }))}
                    className="px-2 py-1 text-xs border border-amber-200 text-amber-700 bg-amber-50 rounded hover:bg-amber-100"
                    title="Assign Engineering"
                  >ENG</button>
                  <button
                    onClick={() => handleDispatch(selectedReport.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    Dispatch
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (selectedReport) {
                      handleDeleteClick(selectedReport.id, selectedReport.title);
                      setSelectedReport(null);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Report
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, reportId: null, reportTitle: '' })}
        onConfirm={handleDelete}
        title="Delete Report"
        message={`Are you sure you want to delete "${deleteConfirm.reportTitle}"? This action cannot be undone and will permanently remove the report from the system.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Notification Stack */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => {
            // Remove the current notification from queue
            setNotificationQueue(prev => {
              if (prev.length > 0) {
                // Remove first notification and show next
                const newQueue = prev.slice(1);
                if (newQueue.length > 0) {
                  const next = newQueue[0];
                  setNotification({ message: next.message, type: next.type });
                } else {
                  setNotification(null);
                }
                return newQueue;
              } else {
                setNotification(null);
                return [];
              }
            });
          }}
        />
      )}
    </div>
  );
}
