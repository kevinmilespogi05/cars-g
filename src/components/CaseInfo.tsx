import React, { useState, useEffect } from 'react';
import { 
  Hash, 
  AlertTriangle, 
  User, 
  Users, 
  MessageSquare, 
  X, 
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
import { LikeDetailsModal } from './LikeDetailsModal';
import { useAuthStore } from '../store/authStore';

interface CaseInfoProps {
  report: Report;
  onUpdate: (updatedReport: Report) => void;
  onClose: () => void;
  isPatrolView?: boolean;
}

export function CaseInfo({ report, onUpdate, onClose, isPatrolView = false }: CaseInfoProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'status_update' | 'assignment' | 'resolution'>('comment');
  const [loading, setLoading] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [likeDetailsModal, setLikeDetailsModal] = useState<{ isOpen: boolean; commentId?: string } | null>(null);

  // Load comments when component mounts
  useEffect(() => {
    loadComments();
  }, [report.id]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await CommentsService.getComments(report.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      const newCommentData = await CommentsService.addComment(report.id, newComment.trim(), commentType);
      setComments(prev => [...prev, newCommentData]);
      setNewComment('');
      
      // Update comment count in parent
      onUpdate({
        ...report,
        comment_count: (report.comment_count || 0) + 1
      });
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
      
      // Update comment count in parent
      onUpdate({
        ...report,
        comment_count: Math.max(0, (report.comment_count || 0) - 1)
      });
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Case #{report.case_number || 'N/A'}
                  </h3>
                  <p className="text-sm text-gray-500">{report.title}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Case Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Priority Level</label>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(report.priority_level || 3)}`}>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Level {report.priority_level || 3} (5 = Highest)
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned Group</label>
                  <p className="text-sm text-gray-900">{report.assigned_group || 'Not assigned'}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned Patroller</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {report.assigned_patroller_name || 'Not assigned'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="flex items-center space-x-2">
                    {report.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                    {report.status === 'in_progress' && <AlertCircle className="h-4 w-4 text-blue-500" />}
                    {report.status === 'resolved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {report.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                    <span className="text-sm text-gray-900 capitalize">
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Comments & Logs ({comments.length})
                </h4>
              </div>

              {/* Comments List */}
              <div className="space-y-3 mb-4">
                {loading && comments.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading comments...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-4">
                    <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No comments yet</p>
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isPatrolComment = comment.comment_type !== 'comment';
                    
                    return (
                      <div key={comment.id} className={`rounded-lg p-4 border-l-4 ${
                        isPatrolComment 
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 shadow-md' 
                          : 'bg-gray-50 border-gray-300'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {isPatrolComment ? (
                                <div className="flex items-center space-x-2">
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <ShieldCheck className="h-3 w-3 text-white" />
                                  </div>
                                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                                    OFFICIAL
                                  </span>
                                </div>
                              ) : (
                                <img
                                  className="h-6 w-6 rounded-full object-cover border border-gray-200"
                                  src={comment.user_profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user_profile?.username || 'User')}`}
                                  alt={comment.user_profile?.username || 'User'}
                                />
                              )}
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                comment.comment_type === 'status_update' ? 'bg-blue-200 text-blue-900' :
                                comment.comment_type === 'assignment' ? 'bg-purple-200 text-purple-900' :
                                comment.comment_type === 'resolution' ? 'bg-green-200 text-green-900' :
                                'bg-gray-200 text-gray-900'
                              }`}>
                                {getCommentTypeIcon(comment.comment_type)}
                                <span className="ml-1">{comment.comment_type.replace('_', ' ')}</span>
                              </span>
                              <span className={`text-xs font-medium ${
                                isPatrolComment ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                by {comment.user_profile?.username || 'Unknown'}
                              </span>
                              <span className={`text-xs ${
                                isPatrolComment ? 'text-blue-500' : 'text-gray-400'
                              }`}>
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                            </div>
                            {editingComment === comment.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                  rows={2}
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditComment(comment.id)}
                                    className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-md hover:bg-emerald-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingComment(null);
                                      setEditCommentText('');
                                    }}
                                    className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className={`rounded-lg p-3 ${
                                isPatrolComment 
                                  ? 'bg-white/70 border border-blue-200' 
                                  : 'bg-white'
                              }`}>
                                <p className={`text-sm ${
                                  isPatrolComment ? 'text-blue-900 font-medium' : 'text-gray-700'
                                }`}>
                                  {comment.comment}
                                </p>
                                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Heart className={`h-3 w-3 ${comment.is_liked ? 'text-red-500 fill-current' : 'text-gray-500'}`} />
                                    <button
                                      onClick={() => {
                                        if ((comment.likes_count || 0) > 0) {
                                          setLikeDetailsModal({ isOpen: true, commentId: comment.id });
                                        }
                                      }}
                                      className={(comment.likes_count || 0) > 0 ? 'underline' : ''}
                                    >
                                      {comment.likes_count || 0}
                                    </button>
                                  </div>
                                  {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                                    <button
                                      onClick={() => setExpanded(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                                      className="hover:text-gray-800"
                                    >
                                      {expanded[comment.id] ? 'Hide replies' : `Show ${comment.replies.length} repl${comment.replies.length === 1 ? 'y' : 'ies'}`}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {isPatrolView && user?.id === comment.user_id && (
                            <div className="flex space-x-1 ml-2">
                              <button
                                onClick={() => {
                                  setEditingComment(comment.id);
                                  setEditCommentText(comment.comment);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {expanded[comment.id] && Array.isArray(comment.replies) && comment.replies.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="ml-6 p-2 bg-gray-50 rounded border border-gray-200">
                                <div className="flex items-center gap-2">
                                  <img
                                    className="h-5 w-5 rounded-full object-cover border border-gray-200"
                                    src={reply.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user.username)}`}
                                    alt={reply.user.username}
                                  />
                                  <span className="text-xs font-medium text-gray-900">{reply.user.username}</span>
                                  <span className="text-[10px] text-gray-500">{new Date(reply.created_at).toLocaleString()}</span>
                                </div>
                                <p className="mt-1 text-sm text-gray-700">{reply.content}</p>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-600">
                                  <Heart className={`h-3 w-3 ${reply.is_liked ? 'text-red-500 fill-current' : 'text-gray-500'}`} />
                                  <span>{reply.likes_count || 0}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Form */}
              {isPatrolView && (
                <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 pt-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="text-xs font-medium text-gray-500">Type</label>
                      <select
                        value={commentType}
                        onChange={(e) => setCommentType(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="comment">Comment</option>
                        <option value="status_update">Status Update</option>
                        <option value="assignment">Assignment</option>
                        <option value="resolution">Resolution</option>
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment or update..."
                        className="flex-1 p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        rows={3}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || loading}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <Send className="h-4 w-4" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
