import { useEffect, useMemo, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Eye, RefreshCw, Hash, User2, Calendar, MapPin, X, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getReportCoordinates, isValidCoordinates } from '../lib/geocoding';
import { ImageViewer } from './ImageViewer';
import { getStatusColor as badgeStatusColor, formatStatusForDisplay } from '../lib/badges';
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
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; action: 'accept' | 'reject'; reportId: string | null }>(
    { open: false, action: 'accept', reportId: null }
  );
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 2500);
  };

  const navigate = useNavigate();

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
      const report = reports.find(r => r.id === reportId);
      const newStatus = report?.status === 'awaiting_verification' ? 'resolved' : 'pending';
      const message = newStatus === 'resolved' ? 'Report marked as resolved' : 'Report marked as pending';
      
      // Award points to reporter when report is verified/accepted
      if (report?.user_id) {
        try {
          const { awardPoints } = await import('../lib/points');
          await awardPoints(report.user_id, 'REPORT_VERIFIED', reportId);
          console.log('🎯 Points awarded for verified report');
        } catch (error) {
          console.error('❌ Error awarding points:', error);
          // Don't fail the whole operation if points fail
        }
      }
      
      setReports(prev => prev.filter(r => r.id !== reportId));
      await reportsService.updateReportStatus(reportId, newStatus);
      showToast(message, 'success');
    } catch (e) {
      await load();
      showToast('Failed to accept report', 'error');
    }
  };

  const reject = async (reportId: string) => {
    try {
      // Find current report to compute image removal (proof image appended last during verification)
      const current = reports.find(r => r.id === reportId);
      const currentImages = Array.isArray(current?.images) ? current!.images : [];
      const nextImages = currentImages.length > 0 ? currentImages.slice(0, -1) : [];

      // Update: remove proof image and revert status back to pending
      const { error } = await (supabase.from('reports') as any)
        .update({ 
          status: 'pending', 
          images: nextImages,
          patrol_user_id: null,
          assigned_patroller_name: null
        })
        .eq('id', reportId);
      if (error) throw error;

      setReports(prev => prev.filter(r => r.id !== reportId));
      showToast('Declined: proof removed, status set to pending', 'success');
    } catch (e) {
      await load();
      showToast('Failed to decline and revert report', 'error');
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {items.filter(r => r.status === statusTab).map(r => {
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
                      <Hash className="w-5 h-5 text-gray-400 flex-shrink-0" />
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
                  </div>
                </div>

                {/* Card Footer - Quick Actions */}
                <div className="p-4 sm:p-5 bg-white">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedReport(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 text-xs font-medium transition-colors"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                    </div>

                    {/* Accept & Decline Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setConfirm({ open: true, action: 'accept', reportId: r.id })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg border border-green-200 text-xs font-medium transition-colors"
                        title="Accept Request"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Accept</span>
                      </button>
                      <button
                        onClick={() => setConfirm({ open: true, action: 'reject', reportId: r.id })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg border border-red-200 text-xs font-medium transition-colors"
                        title="Decline Request"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Decline</span>
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
            <div className="w-full max-w-full sm:max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh]">
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
                <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Description</div>
                  <p className="text-base text-gray-800 leading-relaxed">{selectedReport.description}</p>
                </div>

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
                        <div>{selectedReport.user_profile?.username || 'Unknown'}</div>
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

                {/* Location */}
                {selectedReport.location_address && (
                  <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Location</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-800">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span>{selectedReport.location_address}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                          const isAndroid = /Android/.test(navigator.userAgent);
                          const destination = selectedReport.location_address || '';
                          let navigationUrl = '';
                          if (isIOS) {
                            navigationUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
                          } else if (isAndroid) {
                            navigationUrl = `intent://maps.google.com/maps?daddr=${encodeURIComponent(destination)}&dirflg=d#Intent;scheme=https;package=com.google.android.apps.maps;end`;
                          } else {
                            navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate&nav=1`;
                          }
                          if (isAndroid) {
                            try {
                              window.location.href = navigationUrl;
                              setTimeout(() => {
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate&nav=1`, '_blank');
                              }, 2000);
                            } catch (error) {
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate&nav=1`, '_blank');
                            }
                          } else {
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
                            showToast('Unable to determine location coordinates. Please ensure the report has a valid address or coordinates.', 'error');
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
                  <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Images</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedReport.images.map((src, idx) => (
                          <img
                            key={idx}
                            src={src}
                            alt={`Report image ${idx+1}`}
                            className="w-full h-48 sm:h-56 object-cover rounded-lg border cursor-pointer"
                            onClick={() => { setSelectedImage(src); }}
                          />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
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
        title={confirm.action === 'accept' ? 'Accept Request?' : 'Decline Request?'}
        message={confirm.action === 'accept'
          ? 'Are you sure you want to accept this new case request?'
          : 'Are you sure you want to decline this new case request? This cannot be undone.'}
        confirmText={confirm.action === 'accept' ? 'Yes, accept' : 'Yes, decline'}
        type={confirm.action === 'accept' ? 'success' : 'danger'}
        isLoading={confirmLoading}
      />
      {/* Image Viewer for case request images */}
      {selectedImage && (
        <ImageViewer
          isOpen={!!selectedImage}
          onClose={() => { setSelectedImage(null); }}
          imageUrl={selectedImage}
          alt="Request Image"
          images={selectedReport?.images || []}
          currentIndex={selectedReport?.images ? selectedReport.images.indexOf(selectedImage) : 0}
          onPrevious={() => {
            if (!selectedReport?.images) return;
            const i = selectedReport.images.indexOf(selectedImage!);
            const prev = i > 0 ? i - 1 : selectedReport.images.length - 1;
            setSelectedImage(selectedReport.images[prev]);
          }}
          onNext={() => {
            if (!selectedReport?.images) return;
            const i = selectedReport.images.indexOf(selectedImage!);
            const next = i < selectedReport.images.length - 1 ? i + 1 : 0;
            setSelectedImage(selectedReport.images[next]);
          }}
          showNavigation={!!(selectedReport?.images && selectedReport.images.length > 1)}
        />
      )}
    </div>
  );
}
