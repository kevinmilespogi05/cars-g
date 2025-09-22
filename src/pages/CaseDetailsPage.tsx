import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Hash, 
  AlertTriangle, 
  User, 
  Users, 
  MessageSquare, 
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  Trash2,
  Edit3,
  ShieldCheck,
  Heart
} from 'lucide-react';
import { CommentsService } from '../services/commentsService';
import { reportsService } from '../services/reportsService';
import type { Report, ReportComment } from '../types';
import { LikeDetailsModal } from '../components/LikeDetailsModal';
import { useAuthStore } from '../store/authStore';

export function CaseDetailsPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [report, setReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'status_update' | 'assignment' | 'resolution'>('comment');
  const [loading, setLoading] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [likeDetailsModal, setLikeDetailsModal] = useState<{ isOpen: boolean; commentId?: string } | null>(null);

  // Load report and comments when component mounts
  useEffect(() => {
    if (caseId) {
      loadReport();
    }
  }, [caseId]);

  useEffect(() => {
    if (report?.id) {
      loadComments();
    }
  }, [report?.id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const reportData = await reportsService.getReport(caseId!);
      setReport(reportData);
    } catch (error) {
      console.error('Error loading report:', error);
      navigate('/patrol');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await CommentsService.getComments(report!.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !report) return;

    try {
      setLoading(true);
      const newCommentData = await CommentsService.addComment(report.id, newComment.trim(), commentType);
      setComments(prev => [...prev, newCommentData]);
      setNewComment('');
      
      // Update comment count
      setReport(prev => prev ? {
        ...prev,
        comment_count: (prev.comment_count || 0) + 1
      } : null);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;

    try {
      setLoading(true);
      const updatedComment = await CommentsService.updateComment(commentId, editCommentText.trim());
      setComments(prev => prev.map(c => c.id === commentId ? updatedComment : c));
      setEditingComment(null);
      setEditCommentText('');
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      setLoading(true);
      await CommentsService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      // Update comment count
      setReport(prev => prev ? {
        ...prev,
        comment_count: Math.max(0, (prev.comment_count || 0) - 1)
      } : null);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (level: number) => {
    if (level >= 5) return 'text-red-600 bg-red-100';
    if (level >= 4) return 'text-orange-600 bg-orange-100';
    if (level >= 3) return 'text-yellow-600 bg-yellow-100';
    if (level >= 2) return 'text-blue-600 bg-blue-100';
    return 'text-green-600 bg-green-100';
  };

  const getServiceLevelText = (level: number) => {
    switch (level) {
      case 5:
        return 'Total loss of service';
      case 4:
        return 'Reduction of service';
      case 3:
        return "Can continue work but can't complete most tasks";
      case 2:
        return 'Service work around available';
      case 1:
      default:
        return 'Minor inconvenience';
    }
  };

  // Derive a service level from priority when explicit level is not set
  const deriveLevelFromPriority = (priority?: Report['priority']): number | null => {
    if (!priority) return null;
    switch (priority) {
      case 'high':
        return 5;
      case 'medium':
        return 3;
      case 'low':
        return 1;
      default:
        return null;
    }
  };

  const getEffectiveLevel = (r: Report): number | null => {
    if (typeof r.priority_level === 'number') return r.priority_level;
    return deriveLevelFromPriority(r.priority);
  };

  const capitalize = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

  const getCommentTypeIcon = (type: string) => {
    switch (type) {
      case 'status_update': return <Clock className="h-4 w-4" />;
      case 'assignment': return <Users className="h-4 w-4" />;
      case 'resolution': return <CheckCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'status_update': return 'text-blue-600 bg-blue-100';
      case 'assignment': return 'text-purple-600 bg-purple-100';
      case 'resolution': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading && !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Case Not Found</h1>
          <p className="text-gray-600 mb-6">The case you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/patrol')}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patrol Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Case Header - Always Visible */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => navigate('/patrol')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Case {report.case_number || 'N/A'}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1 line-clamp-2">{report.title}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold ${
                report.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                report.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                report.status === 'awaiting_verification' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                report.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {report.status.replace('_', ' ')}
              </span>
              <span className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold ${
                report.priority === 'high' ? 'bg-red-100 text-red-800 border border-red-200' :
                report.priority === 'medium' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                Priority: {report.priority}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Case Information */}
          <div className="md:col-span-2 lg:col-span-3 space-y-6">
            {/* Case Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-amber-500" />
                Case Details
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Case Level</label>
                    {(() => {
                      const lvl = getEffectiveLevel(report);
                      if (typeof lvl !== 'number' && !report.priority) {
                        return <div className="text-sm text-gray-500 italic">Not set</div>;
                      }
                      return (
                        <div className="flex flex-col gap-3">
                          {report.priority && (
                            <div
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold ${
                                report.priority === 'high'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : report.priority === 'medium'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              {capitalize(report.priority)}
                            </div>
                          )}
                          {typeof lvl === 'number' && (
                            <div
                              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border ${getPriorityColor(lvl)}`}
                              title={getServiceLevelText(lvl)}
                            >
                              Level {lvl} · {getServiceLevelText(lvl)}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Assigned Patroller</label>
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-500" />
                      <span className="text-sm text-gray-900 font-medium">
                        {report.assigned_patroller_name || 'Not assigned'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Status</label>
                    <div className="flex items-center space-x-3">
                      {report.status === 'pending' && <Clock className="h-5 w-5 text-yellow-500" />}
                      {report.status === 'in_progress' && <AlertCircle className="h-5 w-5 text-blue-500" />}
                      {report.status === 'resolved' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {report.status === 'rejected' && <XCircle className="h-5 w-5 text-red-500" />}
                      <span className="text-sm text-gray-900 font-medium capitalize">
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-blue-500" />
                Description
              </h2>
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{report.description}</p>
            </div>

            {/* Location */}
            {report.location_address && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                  <Hash className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-green-500" />
                  Location
                </h2>
                <p className="text-gray-700 text-sm sm:text-base">{report.location_address}</p>
              </div>
            )}
          </div>

          {/* Comments Sidebar */}
          <div className="md:col-span-1 lg:col-span-2 space-y-6">
            {/* Comments Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-blue-600" />
                  Comments & Logs
                  <span className="ml-2 sm:ml-3 px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm font-semibold rounded-full">
                    {comments.length}
                  </span>
                </h2>
              </div>

              {/* Comments List */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {loading && comments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                    <p className="mt-3 text-sm text-gray-500">Loading comments...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No comments yet</p>
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isPatrolComment = comment.comment_type !== 'comment';
                    
                    return (
                      <div key={comment.id} className={`rounded-xl p-4 sm:p-5 border-l-4 shadow-sm ${
                        isPatrolComment 
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500' 
                          : 'bg-gray-50 border-gray-300'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-3 mb-3">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {isPatrolComment ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                      <ShieldCheck className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wide whitespace-nowrap">
                                      OFFICIAL
                                    </span>
                                  </div>
                                ) : (
                                  <img
                                    className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 shadow-sm flex-shrink-0"
                                    src={comment.user_profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user_profile?.username || 'User')}`}
                                    alt={comment.user_profile?.username || 'User'}
                                  />
                                )}
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                                  comment.comment_type === 'status_update' ? 'bg-blue-100 text-blue-800' :
                                  comment.comment_type === 'assignment' ? 'bg-purple-100 text-purple-800' :
                                  comment.comment_type === 'resolution' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {getCommentTypeIcon(comment.comment_type)}
                                  <span className="ml-1.5">{comment.comment_type.replace('_', ' ')}</span>
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500">
                                <span className="font-medium whitespace-nowrap">
                                  by {comment.user_profile?.username || 'Unknown'}
                                </span>
                                <span className="text-gray-400 whitespace-nowrap">
                                  {new Date(comment.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {editingComment === comment.id ? (
                              <div className="space-y-3">
                                <textarea
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                  rows={3}
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditComment(comment.id)}
                                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingComment(null);
                                      setEditCommentText('');
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 font-medium"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg p-4 bg-white shadow-sm">
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {comment.comment}
                                </p>
                                <div className="mt-3 flex items-center gap-6 text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Heart className={`h-4 w-4 ${comment.is_liked ? 'text-red-500 fill-current' : 'text-gray-500'}`} />
                                    <button
                                      onClick={() => {
                                        if ((comment.likes_count || 0) > 0) {
                                          setLikeDetailsModal({ isOpen: true, commentId: comment.id });
                                        }
                                      }}
                                      className={`font-medium ${(comment.likes_count || 0) > 0 ? 'text-blue-600 hover:text-blue-800' : 'text-gray-500'}`}
                                    >
                                      {comment.likes_count || 0} like{(comment.likes_count || 0) !== 1 ? 's' : ''}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          {user?.id === comment.user_id && (
                            <div className="flex space-x-1 sm:space-x-2 flex-shrink-0 self-start">
                              <button
                                onClick={() => {
                                  setEditingComment(comment.id);
                                  setEditCommentText(comment.comment);
                                }}
                                className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit comment"
                              >
                                <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete comment"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Form */}
              <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <img
                      className="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover border-2 border-gray-200 shadow-sm flex-shrink-0"
                      src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.username || 'User')}`}
                      alt={user?.user_metadata?.username || 'User'}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                        <label className="text-xs sm:text-sm font-semibold text-gray-700">Type</label>
                        <select
                          value={commentType}
                          onChange={(e) => setCommentType(e.target.value as any)}
                          className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium"
                        >
                          <option value="comment">Comment</option>
                          <option value="status_update">Status Update</option>
                          <option value="assignment">Assignment</option>
                          <option value="resolution">Resolution</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment or update..."
                      className="flex-1 p-2 sm:p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                      rows={2}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || loading}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 sm:space-x-2 font-semibold shadow-sm transition-colors"
                    >
                      <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">Send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {likeDetailsModal && (
        <LikeDetailsModal
          isOpen={likeDetailsModal.isOpen}
          onClose={() => setLikeDetailsModal(null)}
          commentId={likeDetailsModal.commentId}
          contextLabel={'People who liked this comment'}
        />
      )}
    </div>
  );
}
