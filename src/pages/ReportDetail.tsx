import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Heart, MessageCircle, Send, Loader2, ChevronLeft, ChevronRight, ArrowLeft, X, Reply, Hash, User, Users, ShieldCheck, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { getStatusColor as badgeStatusColor, getPriorityColor as badgePriorityColor } from '../lib/badges';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { LikeDetailsModal } from '../components/LikeDetailsModal';
import { Comment, CommentReply, ReportComment } from '../types';
import { reportsService } from '../services/reportsService';
import { CommentsService } from '../services/commentsService';
import { ReplyThread } from '../components/ReplyThread';
import { caseService } from '../services/caseService';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  location_address: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
  images: string[];
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  // Ticketing system fields
  case_number?: string;
  priority_level?: number;
  assigned_group?: string;
  assigned_patroller_name?: string;
  patrol_user_id?: string;
  can_cancel?: boolean;
}

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reportComments, setReportComments] = useState<ReportComment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; index: number } | null>(null);
  const [likeDetailsModal, setLikeDetailsModal] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedCommentReplies, setExpandedCommentReplies] = useState<{ [key: string]: boolean }>({});
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [commentLikeLoading, setCommentLikeLoading] = useState<{ [key: string]: boolean }>({});
  const [nestedReplyForms, setNestedReplyForms] = useState<{ [key: string]: { content: string; submitting: boolean } }>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<{ commentId: string; items: { id: string; previous_comment: string; created_at: string }[] } | null>(null);
  const [isCommentsCollapsed, setIsCommentsCollapsed] = useState(false);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Create a fallback image data URL
  const fallbackImageUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==";
  
  // Function to get a public URL for an image
  const getImageUrl = (imageUrl: string) => {
    // If it's already a data URL, return as is
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    
    // If it's a Cloudinary URL, return as is (they're already public)
    if (imageUrl.includes('cloudinary.com')) {
      return imageUrl;
    }
    
    // If it's a relative URL or other valid URL, return as is
    if (imageUrl.startsWith('/') || imageUrl.startsWith('http')) {
      // Check if it's an old Supabase URL that might be invalid
      if (imageUrl.includes('supabase.co') && imageUrl.includes('storage')) {
        console.warn('Old Supabase storage URL detected:', imageUrl);
        // For now, return the fallback image
        return fallbackImageUrl;
      }
      return imageUrl;
    }
    
    // If we can't determine the URL type, return the fallback
    console.warn('Unknown image URL format:', imageUrl);
    return fallbackImageUrl;
  };

  useEffect(() => {
    if (id) {
      fetchReport();
      fetchComments();
      fetchReportComments();
    }
  }, [id]);

  // Subscribe to live report updates (status, priority, priority_level, etc.)
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`report_detail_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports', filter: `id=eq.${id}` }, (payload) => {
        setReport((prev) => prev ? ({
          ...prev,
          ...payload.new,
        } as any) : (payload.new as any));
      })
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch {}
    };
  }, [id]);

  // Keyboard shortcuts removed per request

  // Listen for reply like details open requests
  useEffect(() => {
    const handler = (e: any) => {
      const { type, id } = e.detail || {};
      if (type === 'reply' && id) {
        setLikeDetailsModal({ isOpen: true, replyId: id, reportId: '', reportTitle: '' });
      }
    };
    window.addEventListener('open-like-details' as any, handler as any);
    return () => window.removeEventListener('open-like-details' as any, handler as any);
  }, []);

  const fetchReport = async () => {
    try {
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select(`
          *,
          likes:likes(count),
          comments:comments(count),
          report_comments:report_comments(count)
        `)
        .eq('id', id)
        .single();

      if (reportError) throw reportError;

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', reportData.user_id)
        .single();

      if (profileError) throw profileError;

      // Check if current user has liked this report
      const { data: userLikes, error: likeError } = await supabase
        .from('likes')
        .select('id')
        .eq('report_id', id)
        .eq('user_id', user?.id);

      if (likeError) throw likeError;

      const full = {
        ...reportData,
        user: profileData,
        likes_count: reportData.likes?.[0]?.count || 0,
        comments_count: (reportData.comments?.[0]?.count || 0) + (reportData.report_comments?.[0]?.count || 0),
        is_liked: userLikes && userLikes.length > 0
      } as any;
      setReport(full);
      // Load my rating if any
      try {
        const { data: existing } = await supabase
          .from('report_ratings')
          .select('stars')
          .eq('report_id', full.id)
          .eq('requester_user_id', user?.id || '')
          .maybeSingle();
        if (existing?.stars) setMyRating(existing.stars);
      } catch {}
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportComments = async () => {
    try {
      const commentsData = await CommentsService.getComments(id!);
      setReportComments(commentsData);
    } catch (error) {
      console.error('Error fetching report comments:', error);
    }
  };

  const fetchComments = async () => {
    try {
      // First fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('report_id', id)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Then fetch user profiles for all comments
      const userIds = [...new Set(commentsData.map(comment => comment.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user profiles for easy lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Fetch likes count and replies count for each comment
      const commentsWithData = await Promise.all(
        commentsData.map(async (comment) => {
          // Get likes count
          const { count: likesCount } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', comment.id);

          // Get replies count
          const { count: repliesCount } = await supabase
            .from('comment_replies')
            .select('*', { count: 'exact', head: true })
            .eq('parent_comment_id', comment.id);

          // Check if current user has liked this comment
          let isLiked = false;
          if (user) {
            const { data: userLikes } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id);
            isLiked = userLikes && userLikes.length > 0;
          }

          // Get replies for this comment
          const replies = await reportsService.getCommentReplies(comment.id);

          return {
            ...comment,
            user: profilesMap.get(comment.user_id) || { username: 'Unknown User', avatar_url: null },
            likes_count: likesCount || 0,
            replies_count: repliesCount || 0,
            is_liked: isLiked,
            replies: replies
          };
        })
      );

      setComments(commentsWithData);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleLike = async () => {
    console.log('handleLike called, user:', user?.id, 'report:', report?.id);
    if (!user || !report) {
      console.log('User or report not available, returning');
      if (!user) {
        alert('Please sign in to like reports');
        return;
      }
      if (!report) {
        alert('Report not found');
        return;
      }
      return;
    }
    
    setLikeLoading(true);
    try {
      if (report.is_liked) {
        console.log('Unliking report:', report.id);
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('report_id', report.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setReport(prev => prev ? {
          ...prev,
          is_liked: false,
          likes_count: prev.likes_count - 1
        } : null);
      } else {
        console.log('Liking report:', report.id);
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({ report_id: report.id, user_id: user.id });

        if (error) throw error;

        setReport(prev => prev ? {
          ...prev,
          is_liked: true,
          likes_count: prev.likes_count + 1
        } : null);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to like/unlike report. Please try again.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmitComment called, user:', user?.id, 'report:', report?.id, 'content:', commentContent);
    if (!user || !report || !commentContent.trim()) {
      console.log('User, report, or content not available, returning');
      if (!user) {
        alert('Please sign in to comment');
        return;
      }
      if (!report) {
        alert('Report not found');
        return;
      }
      if (!commentContent.trim()) {
        alert('Please enter a comment');
        return;
      }
      return;
    }

    setSubmittingComment(true);
    try {
      console.log('Submitting comment for report:', report.id);
      // Only add to report comments system (unified system)
      const newComment = await CommentsService.addComment(report.id, commentContent.trim(), 'comment');
      setReportComments(prev => [...prev, newComment]);
      
      console.log('Comment submitted successfully');
      
      // Update the report's comment count (legacy + new)
      setReport(prev => prev ? {
        ...prev,
        comments_count: (prev.comments_count || 0) + 1
      } : null);
      
      setCommentContent('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) {
      alert('Please sign in to like comments');
      return;
    }

    setCommentLikeLoading(prev => ({ ...prev, [commentId]: true }));
    try {
      const isLiked = await reportsService.toggleCommentLike(commentId);
      
      // Update both regular comments and report comments
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                is_liked: isLiked,
                likes_count: isLiked 
                  ? (comment.likes_count || 0) + 1 
                  : Math.max(0, (comment.likes_count || 0) - 1)
              }
            : comment
        )
      );

      setReportComments(prev => CommentsService.updateCommentLikeCount(prev, commentId, isLiked));

      // If the like details modal is open for this comment, refresh it
      if (likeDetailsModal?.isOpen && likeDetailsModal?.commentId === commentId) {
        // Trigger a refresh of the like details modal
        setLikeDetailsModal(prev => ({ ...prev, refreshTrigger: Date.now() }));
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      alert('Failed to like/unlike comment. Please try again.');
    } finally {
      setCommentLikeLoading(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const startEdit = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingText(currentText);
  };

  const submitEdit = async () => {
    if (!editingCommentId || !editingText.trim()) return;
    try {
      const updated = await CommentsService.updateComment(editingCommentId, editingText.trim());
      setReportComments(prev => prev.map(c => c.id === editingCommentId ? { ...c, comment: updated.comment, updated_at: updated.updated_at } : c));
      setEditingCommentId(null);
      setEditingText('');
    } catch (e) {
      alert('Failed to update comment');
    }
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const requestDelete = (commentId: string) => setDeletingCommentId(commentId);

  const confirmDelete = async () => {
    if (!deletingCommentId) return;
    try {
      await CommentsService.deleteComment(deletingCommentId);
      setReportComments(prev => prev.filter(c => c.id !== deletingCommentId));
      setDeletingCommentId(null);
    } catch (e) {
      alert('Failed to delete comment');
    }
  };

  const openHistory = async (commentId: string) => {
    const items = await CommentsService.getEditHistory(commentId);
    setHistoryFor({ commentId, items });
  };

  const handleReply = async (commentId: string) => {
    if (!user) {
      alert('Please sign in to reply to comments');
      return;
    }

    if (!replyContent.trim()) {
      alert('Please enter a reply');
      return;
    }

    setSubmittingReply(true);
    try {
      const reply = await reportsService.addCommentReply(commentId, replyContent.trim());
      
      // Add the reply to both regular comments and report comments
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                replies: [...(comment.replies || []), reply],
                replies_count: (comment.replies_count || 0) + 1
              }
            : comment
        )
      );

      setReportComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? {
                ...comment,
                replies: [...(comment.replies || []), reply],
                replies_count: (comment.replies_count || 0) + 1
              }
            : comment
        )
      );
      
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Failed to submit reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleNestedReply = async (replyId: string, commentId: string) => {
    if (!user) {
      alert('Please sign in to reply to comments');
      return;
    }

    const formData = nestedReplyForms[replyId];
    if (!formData || !formData.content.trim()) {
      alert('Please enter a reply');
      return;
    }

    setNestedReplyForms(prev => ({
      ...prev,
      [replyId]: { ...prev[replyId], submitting: true }
    }));

    try {
      const nestedReply = await reportsService.addCommentReply(replyId, formData.content.trim(), true);
      
      // Add the nested reply to the appropriate reply
      setComments(prev => 
        prev.map(comment => {
          if (comment.id === commentId) {
            const addNestedReply = (replies: CommentReply[]): CommentReply[] => {
              return replies.map(reply => {
                if (reply.id === replyId) {
                  return {
                    ...reply,
                    replies: [...(reply.replies || []), nestedReply]
                  };
                }
                if (reply.replies) {
                  return {
                    ...reply,
                    replies: addNestedReply(reply.replies)
                  };
                }
                return reply;
              });
            };

            return {
              ...comment,
              replies: addNestedReply(comment.replies || [])
            };
          }
          return comment;
        })
      );
      
      // Clear the nested reply form
      setNestedReplyForms(prev => {
        const newState = { ...prev };
        delete newState[replyId];
        return newState;
      });
    } catch (error) {
      console.error('Error submitting nested reply:', error);
      alert('Failed to submit reply. Please try again.');
    } finally {
      setNestedReplyForms(prev => ({
        ...prev,
        [replyId]: { ...prev[replyId], submitting: false }
      }));
    }
  };

  const handleReplyLike = async (replyId: string) => {
    if (!user) {
      alert('Please sign in to like replies');
      return;
    }

    setCommentLikeLoading(prev => ({ ...prev, [replyId]: true }));
    try {
      // Optimistic update (both regular comments and report comments trees)
      let previousState: CommentReply | null = null;

      const applyOptimistic = (tree: CommentReply[]): CommentReply[] => {
        const updateReplyLikes = (replies: CommentReply[]): CommentReply[] => {
          return replies.map(reply => {
            if (reply.id === replyId) {
              previousState = previousState || { ...reply };
              const nextLiked = !reply.is_liked;
              const nextCount = nextLiked ? (reply.likes_count || 0) + 1 : Math.max(0, (reply.likes_count || 0) - 1);
              return { ...reply, is_liked: nextLiked, likes_count: nextCount };
            }
            if (reply.replies) {
              return { ...reply, replies: updateReplyLikes(reply.replies) };
            }
            return reply;
          });
        };
        return updateReplyLikes(tree || []);
      };

      setComments(prev => prev.map(comment => ({ ...comment, replies: applyOptimistic(comment.replies || []) })));
      setReportComments(prev => prev.map(comment => ({ ...comment, replies: applyOptimistic(comment.replies || []) })));

      // Call API
      const isLiked = await reportsService.toggleReplyLike(replyId);
      // If server/local result disagrees with optimistic toggle, adjust
      if (previousState && previousState.is_liked === isLiked) {
        // No change needed
      } else if (previousState) {
        const applyFix = (tree: CommentReply[]): CommentReply[] => {
          const fixReplies = (replies: CommentReply[]): CommentReply[] => {
            return replies.map(reply => {
              if (reply.id === replyId) {
                const nextCount = isLiked ? (previousState!.likes_count || 0) + 1 : Math.max(0, (previousState!.likes_count || 0) - 1);
                return { ...reply, is_liked: isLiked, likes_count: nextCount };
              }
              if (reply.replies) return { ...reply, replies: fixReplies(reply.replies) };
              return reply;
            });
          };
          return fixReplies(tree || []);
        };
        setComments(prev => prev.map(comment => ({ ...comment, replies: applyFix(comment.replies || []) })));
        setReportComments(prev => prev.map(comment => ({ ...comment, replies: applyFix(comment.replies || []) })));
      }
    } catch (error) {
      console.error('Error toggling reply like:', error);
      alert('Failed to like/unlike reply. Please try again.');
      // Rollback optimistic update
      const applyRollback = (tree: CommentReply[]): CommentReply[] => {
        const rollback = (replies: CommentReply[]): CommentReply[] => {
          return replies.map(reply => {
            if (reply.id === replyId) {
              const nextLiked = !reply.is_liked;
              const nextCount = nextLiked ? (reply.likes_count || 0) + 1 : Math.max(0, (reply.likes_count || 0) - 1);
              return { ...reply, is_liked: nextLiked, likes_count: nextCount };
            }
            if (reply.replies) return { ...reply, replies: rollback(reply.replies) };
            return reply;
          });
        };
        return rollback(tree || []);
      };
      setComments(prev => prev.map(comment => ({ ...comment, replies: applyRollback(comment.replies || []) })));
      setReportComments(prev => prev.map(comment => ({ ...comment, replies: applyRollback(comment.replies || []) })));
    } finally {
      setCommentLikeLoading(prev => ({ ...prev, [replyId]: false }));
    }
  };

  const getStatusColor = (status: string) => badgeStatusColor(status);

  const getPriorityColor = (priority: string) => badgePriorityColor(priority);

  const getServiceLevelText = (level: number) => {
    switch (level) {
      case 5:
        return 'Total loss of service';
      case 4:
        return 'Reduction of service';
      case 3:
        return "Can continue work but can't complete most tasks";
      case 2:
        return 'Service workaround available';
      case 1:
      default:
        return 'Minor inconvenience';
    }
  };

  // Derive service level from priority when not explicitly set
  const deriveLevelFromPriority = (priority?: Report['priority']): number | null => {
    if (!priority) return null;
    switch (priority) {
      case 'high': return 5;
      case 'medium': return 3;
      case 'low': return 1;
      default: return null;
    }
  };

  const getEffectiveLevel = (r: Report): number | null => {
    if (typeof r.priority_level === 'number') return r.priority_level;
    return deriveLevelFromPriority(r.priority);
  };

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-color" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Report not found</h1>
          <button
            onClick={() => navigate('/reports')}
            className="text-primary-color hover:text-primary-dark"
          >
            <ArrowLeft className="h-5 w-5 inline mr-2" />
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Breadcrumb / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate('/reports')} className="inline-flex items-center gap-1 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </button>
          <span>/</span>
          <span className="text-gray-700 font-medium line-clamp-1">{report.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="px-3 py-1.5 rounded-md text-sm border border-gray-200 hover:bg-gray-50">Comments</button>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="px-3 py-1.5 rounded-md text-sm border border-gray-200 hover:bg-gray-50">Top</button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-0">
        {/* Left: Comments */}
        <aside className="lg:col-span-3 order-1" ref={commentsSectionRef}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Comments & Updates
              </h2>
              <button
                onClick={() => setIsCommentsCollapsed(!isCommentsCollapsed)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span>{isCommentsCollapsed ? 'Show' : 'Hide'}</span>
                {isCommentsCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
            </div>

            {!isCommentsCollapsed && (
              <>
                {user && (
                  <form onSubmit={handleSubmitComment} className="mb-4">
                    <textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Write a comment..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-primary-color focus:border-primary-color text-sm bg-white text-gray-900 placeholder-gray-400 resize-none"
                      ref={commentTextareaRef}
                      rows={3}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingComment || !commentContent.trim()}
                        className="px-3 py-1.5 bg-primary-color text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {reportComments.length === 0 && (
                    <div className="text-center py-6">
                      <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No comments yet. Start the conversation.</p>
                    </div>
                  )}
                  {reportComments.map((comment) => {
                    const isPatrolComment = comment.comment_type !== 'comment';
                    return (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`rounded-lg p-3 border-l-4 ${
                        isPatrolComment 
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 shadow' 
                          : 'bg-white shadow-sm border-gray-100 border-l-gray-300'
                      }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {isPatrolComment ? (
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
                                <ShieldCheck className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <img
                                className="h-7 w-7 rounded-full object-cover border border-gray-200"
                                src={comment.user_profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user_profile?.username || 'Unknown')}`}
                                alt={comment.user_profile?.username || 'Unknown'}
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-sm font-medium ${isPatrolComment ? 'text-blue-900' : 'text-gray-900'}`}>{comment.user_profile?.username || 'Unknown'}</span>
                              <span className="text-[11px] text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                            </div>
                            {editingCommentId === comment.id ? (
                              <div className="mt-1">
                                <textarea
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                                  rows={3}
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                />
                                <div className="mt-2 flex items-center gap-2">
                                  <button onClick={submitEdit} className="px-2 py-1 text-xs bg-primary-color text-white rounded">Save</button>
                                  <button onClick={cancelEdit} className="px-2 py-1 text-xs text-gray-600">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <p className={`text-sm ${isPatrolComment ? 'text-blue-900' : 'text-gray-700'}`}>{comment.comment}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600">
                              <button onClick={() => handleCommentLike(comment.id)} disabled={likeLoading} className={`flex items-center gap-1 ${comment.is_liked ? 'text-red-500' : 'hover:text-red-500'}`}>
                                {likeLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Heart className={`h-3 w-3 ${comment.is_liked ? 'fill-current' : ''}`} />}
                                <span>{comment.likes_count || 0}</span>
                              </button>
                              {/* Edit/Delete for owner or admin-like UI; basic check */}
                              {user?.id === comment.user_id && editingCommentId !== comment.id && (
                                <>
                                  <button onClick={() => startEdit(comment.id, comment.comment)} className="hover:text-gray-800">Edit</button>
                                  <button onClick={() => requestDelete(comment.id)} className="hover:text-red-600">Delete</button>
                                </>
                              )}
                              <button onClick={() => openHistory(comment.id)} className="hover:text-gray-800">History</button>
                              <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="flex items-center gap-1 hover:text-gray-800">
                                <Reply className="h-3 w-3" />
                                Reply
                                {comment.replies_count > 0 && <span>({comment.replies_count})</span>}
                              </button>
                            </div>
                            {replyingTo === comment.id && (
                              <div className="mt-2 p-2 bg-gray-50 rounded">
                                <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} rows={2} className="w-full px-2 py-1 border border-gray-200 rounded text-sm" placeholder="Write a reply..." />
                                <div className="mt-2 flex justify-end gap-2">
                                  <button onClick={() => { setReplyingTo(null); setReplyContent(''); }} className="px-2 py-1 text-xs text-gray-600">Cancel</button>
                                  <button onClick={() => handleReply(comment.id)} disabled={submittingReply || !replyContent.trim()} className="px-2 py-1 text-xs bg-primary-color text-white rounded disabled:opacity-50">{submittingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reply'}</button>
                                </div>
                              </div>
                            )}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="mt-2">
                                <button onClick={() => setExpandedCommentReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))} className="text-[11px] text-gray-600 hover:text-gray-800">
                                  {expandedCommentReplies[comment.id] ? 'Hide replies' : `Show ${comment.replies.length} repl${comment.replies.length === 1 ? 'y' : 'ies'}`}
                                </button>
                                {expandedCommentReplies[comment.id] && (
                                  <div className="mt-1">
                                    <ReplyThread
                                      replies={comment.replies}
                                      commentId={comment.id}
                                      onLike={handleReplyLike}
                                      onReply={handleNestedReply}
                                      likeLoading={commentLikeLoading}
                                      nestedReplyForms={nestedReplyForms}
                                      setNestedReplyForms={setNestedReplyForms}
                                      maxDepth={5}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {isCommentsCollapsed && (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                    <span>{reportComments.length} Comments & Updates</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Click "Show" to view all comments</p>
              </div>
            )}
          </motion.div>
        </aside>

        {/* Center: Main content */}
        <main className="lg:col-span-7 order-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{report.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-4">
              <span>Reported by <span className="font-medium text-gray-700">{report.user.username}</span></span>
              <span>• {new Date(report.created_at).toLocaleString()}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusColor(report.status)}`}>{report.status.replace('_', ' ')}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getPriorityColor(report.priority)}`}>{capitalize(report.priority)}</span>
              {(() => { const lvl = getEffectiveLevel(report); return typeof lvl === 'number' ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${lvl >= 5 ? 'bg-red-100 text-red-800' : lvl >= 4 ? 'bg-orange-100 text-orange-800' : lvl >= 3 ? 'bg-yellow-100 text-yellow-800' : lvl >= 2 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`} title={getServiceLevelText(lvl)}>
                  Level {lvl} · {getServiceLevelText(lvl)}
                </span>
              ) : null; })()}
            </div>

            <p className="text-gray-700 mb-4 whitespace-pre-wrap">{report.description}</p>
            <div className="flex items-center text-sm text-gray-700 mb-6"><MapPin className="h-4 w-4 mr-1.5 flex-shrink-0 text-gray-700" /><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.location_address || '')}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-gray-900">{report.location_address}</a></div>

            {report.images && report.images.length > 0 ? (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Images</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {report.images.map((image, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      className="relative aspect-square cursor-pointer overflow-hidden bg-gray-100 rounded-lg"
                      onClick={() => setSelectedImage({ url: image, index })}
                    >
                      <img src={getImageUrl(image)} alt={`Report image ${index + 1}`} className="absolute inset-0 h-full w-full object-cover rounded-lg border border-gray-200" loading="eager" decoding="sync" fetchpriority="high" referrerPolicy="no-referrer" crossOrigin="anonymous" onError={(e) => { console.error(`Failed to load image: ${image}`); const imgElement = e.target as HTMLImageElement; imgElement.src = fallbackImageUrl; }} style={{ backgroundColor: '#f0f0f0' }} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Images</h2>
                <div className="flex items-center justify-center h-32 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-gray-500">
                  <span className="text-sm">No images attached</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-6">
              <div className="flex items-center gap-3">
                <img className="h-10 w-10 rounded-full object-cover border border-gray-200" src={report.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.user.username)}`} alt={report.user.username} />
                <div>
                  <div className="text-sm font-medium text-gray-900">{report.user.username}</div>
                  <p className="text-xs text-gray-700">{new Date(report.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <button onClick={handleLike} disabled={likeLoading} className={`text-sm ${report.is_liked ? 'text-red-500' : 'text-gray-700 hover:text-red-500'} transition-colors`}>
                    <Heart className={`h-5 w-5 ${report.is_liked ? 'fill-current' : ''}`} />
                  </button>
                  <button onClick={() => { if (report.likes_count > 0) { setLikeDetailsModal({ isOpen: true, reportId: report.id, reportTitle: report.title }); } }} className={`text-sm transition-colors ${report.likes_count > 0 ? 'text-gray-700 hover:text-gray-900 cursor-pointer' : 'text-gray-400 cursor-default'}`} disabled={report.likes_count === 0}>
                    {report.likes_count}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-700"><MessageCircle className="h-5 w-5" /><span>{report.comments_count}</span></div>
                {user?.id && report.status === 'resolved' && (
                  <div className="ml-2 flex items-center gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button
                        key={n}
                        onClick={async () => {
                          if (submittingRating) return;
                          try {
                            setSubmittingRating(true);
                            const saved = await caseService.rateReport(report.id, n as any, null);
                            setMyRating(saved.stars);
                          } catch (e) {
                            alert('Failed to submit rating');
                          } finally {
                            setSubmittingRating(false);
                          }
                        }}
                        className={`p-0.5 ${submittingRating ? 'opacity-50' : ''}`}
                        title={`Rate ${n} star${n>1?'s':''}`}
                      >
                        <Star className={`w-5 h-5 ${myRating && n <= myRating ? 'text-yellow-500 fill-yellow-400' : 'text-gray-400'}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </main>

        {/* Right: Case Info */}
        <aside className="lg:col-span-2 order-3">
          {(report.case_number || report.priority || typeof report.priority_level === 'number' || report.assigned_group || report.assigned_patroller_name) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto"
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Case Information</h3>
              <div className="space-y-3">
                {/* Status & Priority badges moved here */}
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>{report.status.replace('_', ' ')}</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(report.priority)}`}>{capitalize(report.priority)}</span>
                  {(() => { const lvl = getEffectiveLevel(report); return typeof lvl === 'number' ? (
                    <span title={getServiceLevelText(lvl)} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${lvl >= 5 ? 'bg-red-100 text-red-800' : lvl >= 4 ? 'bg-orange-100 text-orange-800' : lvl >= 3 ? 'bg-yellow-100 text-yellow-800' : lvl >= 2 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      Level {lvl} · {getServiceLevelText(lvl)}
                    </span>
                  ) : null; })()}
                </div>
                {report.case_number && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Case Number</p>
                    <p className="text-sm text-gray-900 flex items-center"><Hash className="h-4 w-4 mr-1" />{report.case_number}</p>
                  </div>
                )}
                {/* Service level is already shown in badges above to avoid duplication */}
                {report.assigned_group && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Assigned Group</p>
                    <p className="text-sm text-gray-900 flex items-center"><Users className="h-4 w-4 mr-1" />{report.assigned_group}</p>
                  </div>
                )}
                {report.assigned_patroller_name && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Assigned Patroller</p>
                    <p className="text-sm text-gray-900 flex items-center"><ShieldCheck className="h-4 w-4 mr-1" />{report.assigned_patroller_name}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </aside>
      </div>

      {/* Floating action bar (mobile) */}
      <div className="lg:hidden fixed left-0 right-0 bottom-0 z-40">
        <div className="pointer-events-none px-3 pb-[env(safe-area-inset-bottom)]">
          <div className="pointer-events-auto mx-auto mb-3 max-w-md rounded-full border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-around px-3 py-2">
              <button
                onClick={handleLike}
                className={`inline-flex items-center gap-1.5 text-sm ${report?.is_liked ? 'text-red-600' : 'text-gray-700'} hover:text-red-600`}
              >
                <Heart className={`h-5 w-5 ${report?.is_liked ? 'fill-current' : ''}`} />
                <span>{report?.likes_count || 0}</span>
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <button
                onClick={() => {
                  setIsCommentsCollapsed(false);
                  setTimeout(() => {
                    commentTextareaRef.current?.focus();
                    commentTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 10);
                }}
                className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{report?.comments_count || 0}</span>
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900"
              >
                Top
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && report.images && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-5xl w-full flex items-center justify-center mx-auto">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={getImageUrl(selectedImage.url)}
              alt={`Report image ${selectedImage.index + 1}`}
              className="block mx-auto max-h-[85vh] max-w-full object-contain rounded-lg bg-gray-100"
              loading="eager"
              decoding="sync"
              fetchpriority="high"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={(e) => {
                console.error(`Failed to load modal image: ${selectedImage.url}`);
                const imgElement = e.target as HTMLImageElement;
                imgElement.src = fallbackImageUrl;
              }}
            />
            {report.images.length > 1 && (
              <>
                <button
                  onClick={() => {
                    const prevIndex = (selectedImage.index - 1 + report.images.length) % report.images.length;
                    setSelectedImage({ url: report.images[prevIndex], index: prevIndex });
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  onClick={() => {
                    const nextIndex = (selectedImage.index + 1) % report.images.length;
                    setSelectedImage({ url: report.images[nextIndex], index: nextIndex });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Like Details Modal */}
      {likeDetailsModal && (
        <LikeDetailsModal
          isOpen={likeDetailsModal.isOpen}
          onClose={() => setLikeDetailsModal(null)}
          reportId={likeDetailsModal.reportId}
          reportTitle={likeDetailsModal.reportTitle}
          commentId={likeDetailsModal.commentId}
          replyId={likeDetailsModal.replyId}
          refreshTrigger={likeDetailsModal.refreshTrigger}
          contextLabel={
            likeDetailsModal.replyId ? 'People who liked this reply' :
            likeDetailsModal.commentId ? 'People who liked this comment' :
            (likeDetailsModal.reportTitle ? `People who liked "${likeDetailsModal.reportTitle}"` : 'Likes')
          }
        />
      )}

      {/* Delete confirm */}
      {deletingCommentId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h4 className="font-semibold text-gray-900 mb-2">Delete comment?</h4>
            <p className="text-sm text-gray-600">This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeletingCommentId(null)} className="px-3 py-1.5 text-sm">Cancel</button>
              <button onClick={confirmDelete} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit history modal */}
      {historyFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Edit history</h4>
              <button onClick={() => setHistoryFor(null)} className="text-gray-600 hover:text-gray-800"><X className="h-4 w-4" /></button>
            </div>
            {historyFor.items.length === 0 ? (
              <p className="text-sm text-gray-500">No edits yet.</p>
            ) : (
              <ul className="space-y-3">
                {historyFor.items.map((h) => (
                  <li key={h.id} className="rounded border border-gray-200 p-2">
                    <div className="text-[11px] text-gray-500 mb-1">{new Date(h.created_at).toLocaleString()}</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{h.previous_comment}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 