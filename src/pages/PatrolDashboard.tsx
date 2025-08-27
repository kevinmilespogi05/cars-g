import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, MapPin, RefreshCw, Search, ShieldCheck, X, Trophy, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Report } from '../types';
import { useAuthStore } from '../store/authStore';
import { reportsService } from '../services/reportsService';
import { cloudinary } from '../lib/cloudinary';

export function PatrolDashboard() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress'>('all');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [patrolStats, setPatrolStats] = useState<{
    totalCompleted: number;
    totalExperience: number;
    currentLevel: number;
    experienceToNext: number;
    levelProgress: number;
  }>({
    totalCompleted: 0,
    totalExperience: 0,
    currentLevel: 1,
    experienceToNext: 100,
    levelProgress: 0
  });

  // Calculate level based on experience points
  const calculateLevel = (experience: number) => {
    if (experience < 100) return 1;
    if (experience < 300) return 2;
    if (experience < 600) return 3;
    if (experience < 1000) return 4;
    if (experience < 1500) return 5;
    if (experience < 2100) return 6;
    if (experience < 2800) return 7;
    if (experience < 3600) return 8;
    if (experience < 4500) return 9;
    return 10;
  };

  // Calculate experience needed for next level
  const getExperienceForNextLevel = (currentLevel: number) => {
    const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];
    return levelThresholds[currentLevel] || 4500;
  };

  // Calculate level progress percentage
  const getLevelProgress = (currentExp: number, currentLevel: number) => {
    const currentThreshold = currentLevel === 1 ? 0 : getExperienceForNextLevel(currentLevel - 1);
    const nextThreshold = getExperienceForNextLevel(currentLevel);
    const expInCurrentLevel = currentExp - currentThreshold;
    const expNeededForLevel = nextThreshold - currentThreshold;
    return Math.min(100, Math.max(0, (expInCurrentLevel / expNeededForLevel) * 100));
  };

  // Load patrol statistics from database
  const loadPatrolStats = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('priority, status')
        .eq('status', 'resolved');
      
      if (error) throw error;

      let totalExperience = 0;
      const completedReports = data || [];

      completedReports.forEach(report => {
        switch (report.priority) {
          case 'low':
            totalExperience += 10;
            break;
          case 'medium':
            totalExperience += 25;
            break;
          case 'high':
            totalExperience += 50;
            break;
        }
      });

      const currentLevel = calculateLevel(totalExperience);
      const experienceToNext = getExperienceForNextLevel(currentLevel);
      const levelProgress = getLevelProgress(totalExperience, currentLevel);

      setPatrolStats({
        totalCompleted: completedReports.length,
        totalExperience,
        currentLevel,
        experienceToNext,
        levelProgress
      });
    } catch (e) {
      console.error('Failed to load patrol stats:', e);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // Patrol scope: show non-rejected reports, prioritized by status and priority
      let query = supabase
        .from('reports')
        .select('id, user_id, title, description, category, priority, status, location_address, images, created_at, updated_at');

      if (filterStatus === 'all') {
        query = query.in('status', ['pending', 'in_progress']);
      } else {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query
        .order('priority', { ascending: true })
        .limit(50);
      if (error) throw error;

      // Best-effort hydrate username/avatar from cache via RPC not available; leave as-is
      const mapped = (data || []) as any as Report[];
      setReports(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const markResolvedWithProof = async (reportId: string) => {
    if (!proofFile) return;
    try {
      setProofUploading(true);
      // Upload proof image
      const result = await cloudinary.uploadImage(proofFile, 'cars-g/patrol-proofs');
      // Append image URL to report images and set awaiting verification status
      const { data, error } = await supabase
        .from('reports')
        .update({ 
          status: 'awaiting_verification',
          images: supabase.rpc ? undefined : undefined
        })
        .eq('id', reportId)
        .select('images')
        .single();

      // Fallback: fetch current images then update with new array to avoid RLS limitation with array append
      const currentImages = Array.isArray(selectedReport?.images) ? selectedReport!.images : (data?.images || []);
      const nextImages = [...currentImages, result.secureUrl];

      const { error: updateErr } = await supabase
        .from('reports')
        .update({ status: 'awaiting_verification', images: nextImages })
        .eq('id', reportId);
      if (updateErr) throw updateErr;

      await loadReports();
      setSelectedReport(null);
      setProofFile(null);
    } catch (e) {
      console.error('Failed to submit for verification', e);
    } finally {
      setProofUploading(false);
    }
  };

  useEffect(() => {
    loadReports();
    loadPatrolStats();
  }, [filterStatus]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (r.location_address || '').toLowerCase().includes(q)
    );
  }, [reports, search]);

  const totals = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'pending').length;
    const inProgress = reports.filter(r => r.status === 'in_progress').length;
    const resolved = reports.filter(r => r.status === 'resolved').length;
    return { total, pending, inProgress, resolved };
  }, [reports]);

  const acceptJob = async (reportId: string) => {
    try {
      setActionLoading(true);
      // Optimistic update
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'in_progress' } as Report : r));
      await reportsService.updateReportStatus(reportId, 'in_progress');
      await loadReports();
      setSelectedReport(null);
      setFilterStatus('in_progress');
    } catch (e) {
      await loadReports();
    } finally {
      setActionLoading(false);
    }
  };

  const statusLabel = (status: Report['status']) => {
    switch (status) {
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'awaiting_verification': return 'Awaiting Verification';
      case 'resolved': return 'Resolved';
      case 'rejected': return 'Rejected';
      case 'verifying': return 'Verifying';
      default: return String(status || '').replace('_',' ');
    }
  };

  return (
    <div className="container space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Patrol Dashboard</h1>
            <p className="text-gray-600 text-sm">Welcome{user?.username ? `, ${user.username}` : ''}. Track and service active reports.</p>
          </div>
        </div>
        <button
          onClick={loadReports}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Leveling System */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Patrol Level {patrolStats.currentLevel}</h2>
              <p className="text-gray-600 text-sm">Complete reports to level up and earn experience</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{patrolStats.totalExperience} XP</div>
            <div className="text-sm text-gray-500">Total Experience</div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Level {patrolStats.currentLevel}</span>
            <span>Level {patrolStats.currentLevel + 1}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${patrolStats.levelProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            {patrolStats.experienceToNext - patrolStats.totalExperience} XP to next level
          </div>
        </div>

        {/* Experience Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium text-gray-700">High Priority</span>
            </div>
            <div className="text-lg font-bold text-gray-900">50 XP</div>
            <div className="text-xs text-gray-500">per report</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm font-medium text-gray-700">Medium Priority</span>
            </div>
            <div className="text-lg font-bold text-gray-900">25 XP</div>
            <div className="text-xs text-gray-500">per report</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-gray-700">Low Priority</span>
            </div>
            <div className="text-lg font-bold text-gray-900">10 XP</div>
            <div className="text-xs text-gray-500">per report</div>
          </div>
        </div>

        {/* Level Rewards Preview */}
        <div className="mt-4 pt-4 border-t border-emerald-200">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Next Level Reward</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg px-3 py-2 border border-emerald-200">
              <div className="text-sm font-medium text-gray-900">Level {patrolStats.currentLevel + 1}</div>
              <div className="text-xs text-gray-500">Unlock new features</div>
            </div>
            {patrolStats.currentLevel >= 5 && (
              <div className="bg-white rounded-lg px-3 py-2 border border-amber-200">
                <div className="text-sm font-medium text-amber-900">Elite Status</div>
                <div className="text-xs text-amber-600">Priority access</div>
              </div>
            )}
            {patrolStats.currentLevel >= 10 && (
              <div className="bg-white rounded-lg px-3 py-2 border border-purple-200">
                <div className="text-sm font-medium text-purple-900">Master Patrol</div>
                <div className="text-xs text-purple-600">Maximum rank</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-white flex items-center gap-3">
          <Activity className="w-6 h-6 text-indigo-600" />
          <div>
            <div className="text-xs text-gray-500">Total Active</div>
            <div className="text-xl font-semibold">{totals.total}</div>
          </div>
        </div>
        <div className="p-4 rounded-xl border bg-white flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <div>
            <div className="text-xs text-gray-500">Pending</div>
            <div className="text-xl font-semibold">{totals.pending}</div>
          </div>
        </div>
        <div className="p-4 rounded-xl border bg-white flex items-center gap-3">
          <Clock className="w-6 h-6 text-blue-600" />
          <div>
            <div className="text-xs text-gray-500">In Progress</div>
            <div className="text-xl font-semibold">{totals.inProgress}</div>
          </div>
        </div>
        <div className="p-4 rounded-xl border bg-white flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          <div>
            <div className="text-xs text-gray-500">Resolved</div>
            <div className="text-xl font-semibold">{totals.resolved}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="sr-only">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, description, or location"
              className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-2 rounded-lg border ${filterStatus === 'all' ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-2 rounded-lg border ${filterStatus === 'pending' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-2 rounded-lg border ${filterStatus === 'in_progress' ? 'bg-blue-100 border-blue-300 text-blue-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            In Progress
          </button>
        </div>
      </div>

      <div className="divide-y border rounded-lg bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No reports to display</div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedReport(r)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate">{r.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : r.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : r.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{statusLabel(r.status)}</span>
                    {r.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.priority === 'high' ? 'bg-red-100 text-red-800' : r.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{r.priority}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.location_address || '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-white hover:shadow"
                    title="Open in Maps"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <p className="text-gray-800 mt-2 leading-relaxed">{r.description}</p>
              {r.location_address && (
                <div className="mt-1 text-xs text-gray-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="truncate max-w-[44ch]">{r.location_address}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedReport(null)} />
          <div className="absolute inset-0 px-3 sm:px-4 flex items-start sm:items-center justify-center py-6 sm:py-10">
            <div className="w-full max-w-full sm:max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh]">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 truncate">{selectedReport.title}</h3>
                <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600" aria-label="Close" onClick={() => setSelectedReport(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-4 sm:px-6 py-5 space-y-5 overflow-y-auto">
                <p className="text-base text-gray-800 leading-relaxed">{selectedReport.description}</p>
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
                      <span className={`${selectedReport.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : selectedReport.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : selectedReport.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs px-2 py-0.5 rounded-full`}>{statusLabel(selectedReport.status)}</span>
                    </div>
                  </div>
                  {selectedReport.location_address && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Location</div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-800">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>{selectedReport.location_address}</span>
                      </div>
                    </div>
                  )}
                </div>
                {Array.isArray(selectedReport.images) && selectedReport.images.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Images</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedReport.images.map((src, idx) => (
                        <img
                          key={idx}
                          src={src}
                          alt={`Report image ${idx+1}`}
                          className="w-full h-56 sm:h-64 object-cover rounded-lg border cursor-zoom-in"
                          onClick={() => setLightboxIndex(idx)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t flex flex-wrap items-center justify-between gap-3 sticky bottom-0 bg-white">
                {selectedReport.status === 'in_progress' && (
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="text-sm"
                    />
                    <button
                      onClick={() => selectedReport && proofFile && markResolvedWithProof(selectedReport.id)}
                      disabled={!proofFile || proofUploading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {proofUploading ? 'Uploading...' : 'Submit for Verification'}
                    </button>
                  </div>
                )}
                {selectedReport.status === 'pending' && (
                  <button
                    onClick={() => acceptJob(selectedReport.id)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Accepting...' : 'Accept Job'}
                  </button>
                )}
                <button onClick={() => setSelectedReport(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && selectedReport && Array.isArray(selectedReport.images) && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedReport.images[lightboxIndex]}
              alt={`Report image ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            {selectedReport.images.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between p-4">
                <button
                  onClick={() => setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : selectedReport.images.length - 1)}
                  className="text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
                >
                  ←
                </button>
                <button
                  onClick={() => setLightboxIndex(lightboxIndex < selectedReport.images.length - 1 ? lightboxIndex + 1 : 0)}
                  className="text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}