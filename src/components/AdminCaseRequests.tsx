import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Eye, RefreshCw, Hash, User2, Calendar, MapPin } from 'lucide-react';
import { getStatusColor as badgeStatusColor } from '../lib/badges';
import type { Report } from '../types';
import { reportsService } from '../services/reportsService';
import { supabase } from '../lib/supabase';
import { ConfirmationModal } from './ConfirmationModal';

export function AdminCaseRequests() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<'verifying' | 'awaiting_verification'>('verifying');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; action: 'accept' | 'reject'; reportId: string | null }>(
    { open: false, action: 'accept', reportId: null }
  );
  const [confirmLoading, setConfirmLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsService.getReports({ status: 'verifying', limit: 50 } as any);
      // Also include awaiting_verification if present in schema/UI
      const { data: awaiting } = await supabase
        .from('reports')
        .select(`*, likes:likes(count), comments:comments(count), comment_count:report_comments(count)`) as any;
      const awaitingList = (awaiting || []).filter((r: any) => r.status === 'awaiting_verification');
      const combined = [...data, ...awaitingList].reduce((acc: Report[], curr: any) => {
        if (!acc.find(x => x.id === curr.id)) acc.push(curr);
        return acc;
      }, []);
      setReports(combined);
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const accept = async (reportId: string) => {
    try {
      setReports(prev => prev.filter(r => r.id !== reportId));
      await reportsService.updateReportStatus(reportId, 'resolved');
      showToast('Report marked as resolved', 'success');
    } catch (e) {
      await load();
      showToast('Failed to accept/resolve report', 'error');
    }
  };

  const reject = async (reportId: string) => {
    try {
      // Find current report to compute image removal (proof image appended last during verification)
      const current = reports.find(r => r.id === reportId);
      const currentImages = Array.isArray(current?.images) ? current!.images : [];
      const nextImages = currentImages.length > 0 ? currentImages.slice(0, -1) : [];

      // Update: remove proof image and revert status back to pending
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: 'pending', 
          images: nextImages,
          patrol_user_id: null,
          assigned_patroller_name: null
        })
        .eq('id', reportId);
      if (error) throw error;

      setReports(prev => prev.filter(r => r.id !== reportId));
      showToast('Rejected: proof removed, status set to pending', 'success');
    } catch (e) {
      await load();
      showToast('Failed to reject and revert report', 'error');
    }
  };

  const items = useMemo(() => reports, [reports]);

  return (
    <div className="space-y-3">
      {toast && (
        <div className="fixed top-4 right-4 z-[3000]">
          <div className={`rounded-lg shadow-lg border px-3 py-2 text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">New Case Requests</h2>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      {/* Tabs: Verifying vs Awaiting Verification */}
      {(() => {
        const counts = reports.reduce((acc: any, r) => {
          if (r.status === 'verifying') acc.verifying += 1;
          if (r.status === 'awaiting_verification') acc.awaiting += 1;
          return acc;
        }, { verifying: 0, awaiting: 0 });
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusTab('verifying')}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                statusTab === 'verifying'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Verifying ({counts.verifying})
            </button>
            <button
              onClick={() => setStatusTab('awaiting_verification')}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                statusTab === 'awaiting_verification'
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Awaiting verification ({counts.awaiting})
            </button>
          </div>
        );
      })()}
      {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}
      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading requests...</div>
      ) : reports.filter(r => r.status === statusTab).length === 0 ? (
        <div className="p-6 text-center text-gray-500">No new requests</div>
      ) : (
        <div className="divide-y border rounded-lg bg-white">
          {items.filter(r => r.status === statusTab).map(r => (
            <div key={r.id} className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate">
                      <Link to={`/reports/${r.id}`} className="hover:underline">
                        {r.title}
                      </Link>
                    </h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${badgeStatusColor(r.status)}`}>{r.status.replace('_', ' ')}</span>
                    {r.case_number && (
                      <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800">
                        <Hash className="h-3 w-3 mr-1" />
                        {r.case_number}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">{r.description}</p>
                  <div className="mt-2 text-xs text-gray-600 flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      {r.user_profile?.avatar_url ? (
                        <img src={r.user_profile.avatar_url} className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <User2 className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      <span className="truncate max-w-[120px]">{r.user_profile?.username || 'Unknown'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    {r.location_address && (
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-green-600" />
                        <span className="truncate max-w-[44ch]">{r.location_address}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <Link
                    to={`/reports/${r.id}`}
                    className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 text-xs sm:text-sm"
                    title="View"
                  >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    View
                  </Link>
                  <button
                    onClick={() => setConfirm({ open: true, action: 'accept', reportId: r.id })}
                    className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded border border-green-200 text-xs sm:text-sm"
                    title="Accept"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => setConfirm({ open: true, action: 'reject', reportId: r.id })}
                    className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 text-xs sm:text-sm"
                    title="Reject"
                  >
                    <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirm.open}
        onClose={() => setConfirm(prev => ({ ...prev, open: false }))}
        onConfirm={async () => {
          const id = confirm.reportId;
          if (!id) return;
          try {
            setConfirmLoading(true);
            if (confirm.action === 'accept') {
              await accept(id);
            } else {
              await reject(id);
            }
          } finally {
            setConfirmLoading(false);
            setConfirm(prev => ({ ...prev, open: false }));
          }
        }}
        title={confirm.action === 'accept' ? 'Accept Request?' : 'Reject Request?'}
        message={confirm.action === 'accept'
          ? 'Are you sure you want to accept this new case request?'
          : 'Are you sure you want to reject this new case request? This cannot be undone.'}
        confirmText={confirm.action === 'accept' ? 'Yes, accept' : 'Yes, reject'}
        type={confirm.action === 'accept' ? 'success' : 'danger'}
        isLoading={confirmLoading}
      />
    </div>
  );
}
