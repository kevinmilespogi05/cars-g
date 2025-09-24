import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, CheckCircle2, XCircle, Wrench, RefreshCw, Eye, Trash2, User2, Calendar, MapPin, X, Navigation, Hash, CalendarDays } from 'lucide-react';
import { getStatusColor as badgeStatusColor } from '../lib/badges';
import { reportsService } from '../services/reportsService';
import type { Report } from '../types';
import { supabase } from '../lib/supabase';
import { FocusTrap } from './FocusTrap';
import { awardPoints } from '../lib/points';
import { caseService } from '../services/caseService';

type StatusFilter = 'All' | 'verifying' | 'pending' | 'in_progress' | 'resolved' | 'rejected';

export function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('resolved');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const loadingRef = React.useRef(false);

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
    } catch (e: any) {
      setError(e?.message || 'Failed to load reports');
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

  const givePatrolRewards = async (patrolUserId: string, priority: string) => {
    try {
      // Calculate rewards based on priority
      let points = 0;
      
      switch (priority) {
        case 'low':
          points = 5;
          break;
        case 'medium':
          points = 15;
          break;
        case 'high':
          points = 30;
          break;
        default:
          points = 10;
      }

      // Update patrol officer's stats in the database
      const { error: statsError } = await supabase
        .from('user_stats')
        .upsert({
          user_id: patrolUserId,
          total_points: points,
          reports_resolved: 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (statsError) {
        console.error('Error updating patrol stats:', statsError);
        // Try alternative approach if RPC functions don't exist
        const { data: currentStats } = await supabase
          .from('user_stats')
          .select('total_points, reports_resolved')
          .eq('user_id', patrolUserId)
          .single();

        if (currentStats) {
          const { error: updateError } = await supabase
            .from('user_stats')
            .update({
              total_points: (currentStats.total_points || 0) + points,
              reports_resolved: (currentStats.reports_resolved || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', patrolUserId);

          if (updateError) {
            console.error('Error updating patrol stats (fallback):', updateError);
          }
        } else {
          // Create new stats record if none exists
          const { error: insertError } = await supabase
            .from('user_stats')
            .insert({
              user_id: patrolUserId,
              total_points: points,
              reports_resolved: 1,
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error creating patrol stats:', insertError);
          }
        }
      }

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
          const { CommentsService } = await import('../services/commentsService');
          await CommentsService.addComment(reportId, `Assigned to ${group}${assignee ? ` (${assignee})` : ''} · Task: ${responsibility}`, 'assignment');
        } catch {}
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to dispatch');
      await loadReports();
    }
  };

  const updateStatus = async (reportId: string, newStatus: Report['status']) => {
    try {
      // Get the current report to check if we're moving from in_progress to resolved
      const currentReport = reports.find(r => r.id === reportId);
      const isCompletingReport = currentReport?.status === 'in_progress' && newStatus === 'resolved';

      // If completing a report (moving from in_progress to resolved), give rewards to both patrol officer and reporter
      if (isCompletingReport) {
        // Give rewards to patrol officer if assigned
        if (currentReport?.patrol_user_id) {
          await givePatrolRewards(currentReport.patrol_user_id, currentReport.priority);
        }
        
        // Give rewards to the reporter
        await giveReporterRewards(currentReport.user_id, reportId);
      }

      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      await reportsService.updateReportStatus(reportId, newStatus);
    } catch (e) {
      // revert on failure
      await loadReports();
    }
  };

  const handleView = (report: Report) => {
    setSelectedReport(report);
  };

  const handleDelete = async (reportId: string) => {
    const confirmed = window.confirm('Delete this report? This action cannot be undone.');
    if (!confirmed) return;
    try {
      // Optimistically remove from UI
      setReports(prev => prev.filter(r => r.id !== reportId));
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      if (error) throw error;
    } catch (e: any) {
      alert(e?.message || 'Failed to delete report');
      await loadReports();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or description"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            <option value="rejected">Rejected</option>
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
          <div className="relative">
            <button
              onClick={async () => {
                setShowMonthPicker(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              title="Generate Monthly Cases"
            >
              <CalendarDays className="w-4 h-4" />
              Gen Month
            </button>
          </div>
          <div className="relative">
            <button
              onClick={async () => {
                setShowYearPicker(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              title="Generate Yearly Cases"
            >
              <CalendarDays className="w-4 h-4" />
              Gen Year
            </button>
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
                      const all = await caseService.getMonthlyCases(year, month);
                      await caseService.generateMonthly(year, month);
                      const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
                      exportReportsCsv(all as any, `${monthName}, ${year} report.csv`);
                      setShowMonthPicker(false);
                    } catch (e: any) {
                      alert(e?.message || 'Failed to export monthly report');
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
                      const all = await caseService.getYearlyCases(year);
                      await caseService.generateYearly(year);
                      exportReportsCsv(all as any, `${year} report.csv`);
                      setShowYearPicker(false);
                    } catch (e: any) {
                      alert(e?.message || 'Failed to export yearly report');
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

      <div className="divide-y border rounded-lg bg-white">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading reports...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No reports found</div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="p-3 sm:p-4">
              {/* Header row: title + badges + right actions */}
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">
                      <Link to={`/reports/${r.id}`} className="hover:underline">{r.title}</Link>
                    </h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${badgeStatusColor(r.status)}`}>{r.status.replace('_', ' ')}</span>
                    {r.priority && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.priority === 'high' ? 'bg-red-100 text-red-800' : r.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{r.priority}</span>
                    )}
                    {r.case_number && (
                      <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800">
                        <Hash className="h-3 w-3 mr-1" />
                        {r.case_number}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <Link
                    to={`/reports/${r.id}`}
                    className="p-1.5 sm:p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                    title="View"
                    aria-label="View"
                  >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 sm:p-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                    title="Delete"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>

              {/* Description (improved readability) */}
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed mt-2 line-clamp-2 sm:line-clamp-none">
                {r.description}
              </p>

              {/* Meta info */}
              <div className="mt-2 text-xs text-gray-600 flex items-center gap-3 sm:gap-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  {r.user_profile?.avatar_url ? (
                    <img src={r.user_profile.avatar_url} alt={r.user_profile.username || 'User'} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <User2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[120px] sm:max-w-none">{r.user_profile?.username || 'Unknown'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
                {r.location_address && (
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-green-600" />
                    <span className="truncate max-w-[44ch]">{r.location_address}</span>
                  </span>
                )}
              </div>

              {/* Actions row */}
              <div className="mt-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {(['pending','in_progress','resolved','rejected'] as const)
                  .filter(target => target !== r.status)
                  .sort((a, b) => {
                    // Preferred order depending on current status
                    const orderMap: Record<string, Record<string, number>> = {
                      pending: { in_progress: 0, resolved: 1, rejected: 2, pending: 99 },
                      in_progress: { resolved: 0, rejected: 1, pending: 2, in_progress: 99 },
                      resolved: { in_progress: 0, pending: 1, rejected: 2, resolved: 99 },
                      rejected: { pending: 0, in_progress: 1, resolved: 2, rejected: 99 },
                    };
                    
                    // Default to pending order if status is undefined or unknown
                    const currentStatus = r.status || 'pending';
                    const statusOrder = orderMap[currentStatus] || orderMap.pending;
                    
                    return (statusOrder[a] || 99) - (statusOrder[b] || 99);
                  })
                  .map(target => (
                    <button
                      key={target}
                      onClick={() => updateStatus(r.id, target)}
                      className={
                        target === 'pending'
                          ? 'inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-yellow-800 bg-yellow-50 hover:bg-yellow-100 rounded border border-yellow-200 text-xs sm:text-sm'
                          : target === 'in_progress'
                          ? 'inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 text-xs sm:text-sm'
                          : target === 'resolved'
                          ? 'inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 text-xs sm:text-sm'
                          : 'inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 text-xs sm:text-sm'
                      }
                      title={
                        target === 'pending'
                          ? 'Mark Pending'
                          : target === 'in_progress'
                          ? 'Mark In Progress'
                          : target === 'resolved'
                          ? 'Mark Resolved'
                          : 'Reject'
                      }
                    >
                      {target === 'resolved' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : target === 'rejected' ? (
                        <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : (
                        <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {target === 'pending'
                          ? 'Mark Pending'
                          : target === 'in_progress'
                          ? 'Mark In Progress'
                          : target === 'resolved'
                          ? 'Mark Resolved'
                          : 'Mark Rejected'}
                      </span>
                      <span className="sm:hidden">
                        {target === 'pending'
                          ? 'Pending'
                          : target === 'in_progress'
                          ? 'Progress'
                          : target === 'resolved'
                          ? 'Resolved'
                          : 'Rejected'}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedReport(null)} />
          <div className="absolute inset-0 px-2 sm:px-4 flex items-start sm:items-center justify-center py-6 sm:py-10">
            <FocusTrap>
            <div className="w-full max-w-full sm:max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 truncate">{selectedReport.title}</h3>
                <button
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                  aria-label="Close"
                  onClick={() => setSelectedReport(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Body */}
              <div className="px-4 sm:px-6 py-5 space-y-5 overflow-y-auto">
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
                      <span className={`${selectedReport.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : selectedReport.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : selectedReport.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs px-2 py-0.5 rounded-full`}>{selectedReport.status.replace('_', ' ')}</span>
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
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedReport.location_address || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700"
                      >
                        <MapPin className="w-3 h-3" />
                        Open in Maps
                      </a>
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
                    if (selectedReport) handleDelete(selectedReport.id);
                    setSelectedReport(null);
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
    </div>
  );
}
