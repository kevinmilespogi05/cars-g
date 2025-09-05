import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle2, Clock, MapPin, RefreshCw, Search, ShieldCheck, X, Trophy, Star, Navigation, Hash, Users, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Report } from '../types';
import { useAuthStore } from '../store/authStore';
import { reportsService } from '../services/reportsService';
import { cloudinary } from '../lib/cloudinary';
import { AnnouncementCarousel } from '../components/AnnouncementCarousel';
import { CaseInfo } from '../components/CaseInfo';


export function PatrolDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'awaiting_verification'>('all');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [showCaseInfo, setShowCaseInfo] = useState(false);
  const [selectedCaseReport, setSelectedCaseReport] = useState<Report | null>(null);
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
  const [allReportsStats, setAllReportsStats] = useState<{
    total: number;
    pending: number;
    inProgress: number;
    awaitingVerification: number;
    resolved: number;
  }>({
    total: 0,
    pending: 0,
    inProgress: 0,
    awaitingVerification: 0,
    resolved: 0
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

  // Load all reports statistics for dashboard overview (not affected by filters)
  const loadAllReportsStats = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('status')
        .in('status', ['pending', 'in_progress', 'awaiting_verification', 'resolved']);
      
      if (error) throw error;

      const allReports = data || [];
      const pending = allReports.filter(r => r.status === 'pending').length;
      const inProgress = allReports.filter(r => r.status === 'in_progress').length;
      const awaitingVerification = allReports.filter(r => r.status === 'awaiting_verification').length;
      const resolved = allReports.filter(r => r.status === 'resolved').length;
      
      // Total Active should only count non-resolved reports (what's shown in the list)
      const totalActive = pending + inProgress + awaitingVerification;

      setAllReportsStats({
        total: totalActive, // Changed from allReports.length to totalActive
        pending,
        inProgress,
        awaitingVerification,
        resolved
      });
    } catch (e) {
      console.error('Failed to load all reports stats:', e);
    }
  };

  // Load patrol statistics from database
  const loadPatrolStats = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('reports')
        .select('priority, status')
        .eq('status', 'resolved')
        .eq('patrol_user_id', user.id);
      
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
        .select('id, user_id, patrol_user_id, title, description, category, priority, status, location_address, images, created_at, updated_at, case_number, priority_level, assigned_group, assigned_patroller_name, can_cancel');

      if (filterStatus === 'all') {
        query = query.in('status', ['pending', 'in_progress', 'awaiting_verification']);
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
      await loadAllReportsStats();
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
    loadAllReportsStats();
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
    // Use allReportsStats for dashboard overview (not affected by filters)
    // This shows the overall community information regardless of search/filter
    return {
      total: allReportsStats.total,
      pending: allReportsStats.pending,
      inProgress: allReportsStats.inProgress,
      awaitingVerification: allReportsStats.awaitingVerification,
      resolved: allReportsStats.resolved,
      myResolved: patrolStats.totalCompleted // Reports resolved by this patrol officer
    };
  }, [allReportsStats, patrolStats.totalCompleted]);

  const acceptJob = async (reportId: string) => {
    if (!user?.id) return;
    
    try {
      setActionLoading(true);
      
      // Check if the job is already accepted by another patrol officer
      const report = reports.find(r => r.id === reportId);
      if (report?.patrol_user_id && report.patrol_user_id !== user.id) {
        alert('This job has already been accepted by another patrol officer.');
        return;
      }
      
      // Get the user's profile to get the proper username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      const patrollerName = profile?.username || user.username || user.email?.split('@')[0] || 'Patrol Officer';
      
      // Optimistic update
      setReports(prev => prev.map(r => r.id === reportId ? { 
        ...r, 
        status: 'in_progress',
        patrol_user_id: user.id,
        assigned_patroller_name: patrollerName
      } as Report : r));
      
      // Update the report with status and patrol assignment
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: 'in_progress',
          patrol_user_id: user.id,
          assigned_patroller_name: patrollerName
        })
        .eq('id', reportId);
        
      if (error) throw error;
      
      await loadReports();
      await loadAllReportsStats();
      setSelectedReport(null);
      setFilterStatus('in_progress');
    } catch (e) {
      console.error('Failed to accept job:', e);
      await loadReports();
      await loadAllReportsStats();
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

  const openWaypointNavigation = (destination: string) => {
    // Detect platform and use appropriate navigation method
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
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
  };

  const handleOpenCaseInfo = (report: Report) => {
    setSelectedCaseReport(report);
    setShowCaseInfo(true);
  };

  const handleUpdateReport = (updatedReport: Report) => {
    setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    if (selectedCaseReport?.id === updatedReport.id) {
      setSelectedCaseReport(updatedReport);
    }
  };

  const handleAssignToGroup = async (reportId: string, group: string) => {
    try {
      setActionLoading(true);
      const updatedReport = await reportsService.updateReportTicketing(reportId, {
        assigned_group: group as any
      });
      handleUpdateReport(updatedReport);
      
      // Add a comment about the assignment
      const { CommentsService } = await import('../services/commentsService');
      await CommentsService.addComment(reportId, `Assigned to ${group}`, 'assignment');
    } catch (error) {
      console.error('Error assigning to group:', error);
      alert('Failed to assign to group. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const unacceptJob = async (reportId: string) => {
    if (!user?.id) return;
    try {
      setActionLoading(true);
      // Optimistic update
      setReports(prev => prev.map(r => r.id === reportId ? ({
        ...r,
        status: 'pending',
        patrol_user_id: null,
        assigned_patroller_name: null
      } as any) : r));

      const { error } = await supabase
        .from('reports')
        .update({ status: 'pending', patrol_user_id: null, assigned_patroller_name: null })
        .eq('id', reportId);
      if (error) throw error;

      await loadReports();
      await loadAllReportsStats();
      setSelectedReport(null);
    } catch (e) {
      console.error('Failed to cancel acceptance:', e);
      await loadReports();
      await loadAllReportsStats();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPriority = async (reportId: string, priorityLevel: number) => {
    try {
      setActionLoading(true);
      const updatedReport = await reportsService.updateReportTicketing(reportId, {
        priority_level: priorityLevel
      });
      handleUpdateReport(updatedReport);
      
      // Add a comment about the priority change
      const { CommentsService } = await import('../services/commentsService');
      await CommentsService.addComment(reportId, `Priority level set to ${priorityLevel}`, 'status_update');
    } catch (error) {
      console.error('Error setting priority:', error);
      alert('Failed to set priority. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTicket = async (reportId: string) => {
    const reason = prompt('Please provide a reason for cancelling this ticket:');
    if (!reason) return;

    try {
      setActionLoading(true);
      const updatedReport = await reportsService.cancelReport(reportId, reason);
      handleUpdateReport(updatedReport);
      setShowCaseInfo(false);
    } catch (error) {
      console.error('Error cancelling ticket:', error);
      alert('Failed to cancel ticket. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Patrol Dashboard</h1>
                  <p className="text-sm text-gray-500">Welcome{user?.username ? `, ${user.username}` : ''}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                loadReports();
                loadPatrolStats();
                loadAllReportsStats();
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Announcements Section */}
        <AnnouncementCarousel />
        {/* Stats Overview (clickable filters) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <button
            onClick={() => setFilterStatus('all')}
            className={`text-left bg-white rounded-xl p-6 shadow-sm border transition-all ${
              filterStatus === 'all' ? 'border-emerald-300 ring-2 ring-emerald-200' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Active</p>
                <p className="text-2xl font-bold text-gray-900">{totals.total}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setFilterStatus('pending')}
            className={`text-left bg-white rounded-xl p-6 shadow-sm border transition-all ${
              filterStatus === 'pending' ? 'border-amber-300 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{totals.pending}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`text-left bg-white rounded-xl p-6 shadow-sm border transition-all ${
              filterStatus === 'in_progress' ? 'border-blue-300 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{totals.inProgress}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setFilterStatus('awaiting_verification')}
            className={`text-left bg-white rounded-xl p-6 shadow-sm border transition-all ${
              filterStatus === 'awaiting_verification' ? 'border-orange-300 ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheck className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Awaiting Verification</p>
                <p className="text-2xl font-bold text-gray-900">{totals.awaitingVerification}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/profile')}
            className="text-left bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-gray-300 transition-all"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">My Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{totals.myResolved}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Level Progress */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Level {patrolStats.currentLevel}</h2>
                <p className="text-sm text-gray-500">{patrolStats.totalExperience} XP • {patrolStats.experienceToNext - patrolStats.totalExperience} XP to next level</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-100 rounded-full">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">{totals.myResolved} Reports Resolved</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${patrolStats.levelProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading reports...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <AlertTriangle className="h-12 w-12" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No reports found</h3>
              <p className="mt-2 text-gray-500">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filtered.map((report) => (
                <div
                  key={report.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{report.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          report.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          report.status === 'awaiting_verification' ? 'bg-orange-100 text-orange-800' :
                          report.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {statusLabel(report.status)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.priority === 'high' ? 'bg-red-100 text-red-800' :
                          report.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {report.priority}
                        </span>
                        {report.case_number && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <Hash className="h-3 w-3 mr-1" />
                            #{report.case_number}
                          </span>
                        )}
                        {report.priority_level && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            report.priority_level >= 5 ? 'bg-red-100 text-red-800' :
                            report.priority_level >= 4 ? 'bg-orange-100 text-orange-800' :
                            report.priority_level >= 3 ? 'bg-yellow-100 text-yellow-800' :
                            report.priority_level >= 2 ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            Level {report.priority_level}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">{report.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {report.location_address && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate max-w-xs">{report.location_address}</span>
                          </div>
                        )}
                        {report.patrol_user_id && (
                          <div className={`flex items-center space-x-1 ${
                            report.patrol_user_id === user?.id ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            <ShieldCheck className="h-4 w-4" />
                            <span>{report.patrol_user_id === user?.id ? 'Assigned to you' : 'Assigned'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCaseInfo(report);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Case Details"
                      >
                        <Hash className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openWaypointNavigation(report.location_address || '');
                        }}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Navigate to Location"
                      >
                        <Navigation className="h-5 w-5" />
                      </button>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.location_address || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Open in Maps"
                      >
                        <MapPin className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedReport(null)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              <div className="bg-white px-6 py-4 border-b border-gray-200 sticky top-0 z-10">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{selectedReport.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${
                        selectedReport.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        selectedReport.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        selectedReport.status === 'awaiting_verification' ? 'bg-orange-100 text-orange-800' :
                        selectedReport.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {statusLabel(selectedReport.status)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${
                        selectedReport.priority === 'high' ? 'bg-red-100 text-red-800' :
                        selectedReport.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        Priority: {selectedReport.priority}
                      </span>
                      {selectedReport.case_number && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-800">
                          <Hash className="h-3 w-3 mr-1" /> #{selectedReport.case_number}
                        </span>
                      )}
                      {selectedReport.priority_level && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${
                          selectedReport.priority_level >= 5 ? 'bg-red-100 text-red-800' :
                          selectedReport.priority_level >= 4 ? 'bg-orange-100 text-orange-800' :
                          selectedReport.priority_level >= 3 ? 'bg-yellow-100 text-yellow-800' :
                          selectedReport.priority_level >= 2 ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          Level {selectedReport.priority_level}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{selectedReport.description}</p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Category</p>
                    <p className="text-sm text-gray-900">{selectedReport.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Priority</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedReport.priority === 'high' ? 'bg-red-100 text-red-800' :
                      selectedReport.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedReport.priority}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedReport.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      selectedReport.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      selectedReport.status === 'awaiting_verification' ? 'bg-orange-100 text-orange-800' :
                      selectedReport.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {statusLabel(selectedReport.status)}
                    </span>
                  </div>
                  {selectedReport.patrol_user_id && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Assignment</p>
                      <div className={`flex items-center space-x-1 text-sm ${
                        selectedReport.patrol_user_id === user?.id ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        <ShieldCheck className={`h-4 w-4 ${
                          selectedReport.patrol_user_id === user?.id ? 'text-green-600' : 'text-blue-600'
                        }`} />
                        <span>
                          {selectedReport.patrol_user_id === user?.id 
                            ? `Assigned to you (${selectedReport.assigned_patroller_name || 'patrol officer'})`
                            : `Assigned to ${selectedReport.assigned_patroller_name || 'patrol officer'}`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ticketing Information */}
                {(selectedReport.case_number || selectedReport.priority_level || selectedReport.assigned_group) && (
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Case Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedReport.case_number && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Case Number</p>
                          <p className="text-sm text-gray-900 flex items-center">
                            <Hash className="h-4 w-4 mr-1" />
                            #{selectedReport.case_number}
                          </p>
                        </div>
                      )}
                      {selectedReport.priority_level && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Priority Level</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedReport.priority_level >= 5 ? 'bg-red-100 text-red-800' :
                            selectedReport.priority_level >= 4 ? 'bg-orange-100 text-orange-800' :
                            selectedReport.priority_level >= 3 ? 'bg-yellow-100 text-yellow-800' :
                            selectedReport.priority_level >= 2 ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            Level {selectedReport.priority_level} (5 = Highest)
                          </span>
                        </div>
                      )}
                      {selectedReport.assigned_group && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Assigned Group</p>
                          <p className="text-sm text-gray-900 flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {selectedReport.assigned_group}
                          </p>
                        </div>
                      )}
                      {selectedReport.assigned_patroller_name && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Assigned Patroller</p>
                          <p className="text-sm text-gray-900 flex items-center">
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            {selectedReport.assigned_patroller_name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedReport.location_address && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-500 mb-2">Location</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-900 mb-3">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <span>{selectedReport.location_address}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openWaypointNavigation(selectedReport.location_address || '')}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Navigate
                      </button>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedReport.location_address || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Open in Maps
                      </a>
                    </div>
                  </div>
                )}
                
                {Array.isArray(selectedReport.images) && selectedReport.images.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Images</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedReport.images.map((src, idx) => (
                        <img
                          key={idx}
                          src={src}
                          alt={`Report image ${idx+1}`}
                          className="w-full h-32 md:h-40 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxIndex(idx)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                <div className="flex space-x-3">
                  {selectedReport.status === 'in_progress' && (
                    <div className="flex items-center space-x-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="text-sm"
                      />
                      <button
                        onClick={() => selectedReport && proofFile && markResolvedWithProof(selectedReport.id)}
                        disabled={!proofFile || proofUploading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {proofUploading ? 'Uploading...' : 'Submit for Verification'}
                      </button>
                      {selectedReport.patrol_user_id === user?.id && (
                        <button
                          onClick={() => unacceptJob(selectedReport.id)}
                          disabled={actionLoading}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          {actionLoading ? 'Cancelling...' : 'Cancel Job'}
                        </button>
                      )}
                    </div>
                  )}
                  {selectedReport.status === 'pending' && (
                    <div className="flex items-center space-x-3">
                      {selectedReport.patrol_user_id && selectedReport.patrol_user_id !== user?.id ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <ShieldCheck className="h-4 w-4 text-orange-500" />
                          <span>Accepted by another patrol officer</span>
                        </div>
                      ) : selectedReport.patrol_user_id === user?.id ? (
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2 text-sm text-green-600">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                            <span>You have accepted this job</span>
                          </div>
                          <button
                            onClick={() => unacceptJob(selectedReport.id)}
                            disabled={actionLoading}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                          >
                            {actionLoading ? 'Cancelling...' : 'Cancel Acceptance'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => acceptJob(selectedReport.id)}
                          disabled={actionLoading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {actionLoading ? 'Accepting...' : 'Accept Job'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && selectedReport && Array.isArray(selectedReport.images) && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
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
                  className="text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
                >
                  ←
                </button>
                <button
                  onClick={() => setLightboxIndex(lightboxIndex < selectedReport.images.length - 1 ? lightboxIndex + 1 : 0)}
                  className="text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Case Info Modal */}
      {showCaseInfo && selectedCaseReport && (
        <CaseInfo
          report={selectedCaseReport}
          onUpdate={handleUpdateReport}
          onClose={() => setShowCaseInfo(false)}
          isPatrolView={true}
        />
      )}
    </div>
  );
}