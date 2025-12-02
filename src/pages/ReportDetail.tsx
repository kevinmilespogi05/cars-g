import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Heart, MessageCircle, Send, Loader2, ChevronLeft, ChevronRight, ArrowLeft, ArrowUp, X, Reply, Hash, User, Users, ShieldCheck, ChevronDown, ChevronUp, Star, FileDown, Calendar, Clock } from 'lucide-react';
import { getStatusColor as badgeStatusColor, formatStatusForDisplay } from '../lib/badges';
import { MobileBackToReports } from '../components/MobileBackToReports';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useVerificationStatus } from '../hooks/useVerificationStatus';
import { useToastContext } from '../contexts/ToastContext';
import { LikeDetailsModal } from '../components/LikeDetailsModal';
import { Comment, CommentReply, ReportComment } from '../types';
import { reportsService } from '../services/reportsService';
import { CommentsService } from '../services/commentsService';
import { ReplyThread } from '../components/ReplyThread';
import { caseService } from '../services/caseService';
import { ImageViewer } from '../components/ImageViewer';
import { getReportCoordinates } from '../lib/geocoding';
import { StatusTimeline, TimelineEvent } from '../components/ui/StatusTimeline';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'resolved' | 'declined';
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
  is_anonymous?: boolean; // Anonymous reporting flag
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
  const { isPending } = useVerificationStatus();
  const { error: showToastError } = useToastContext();
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
  const [mobileImageIndex, setMobileImageIndex] = useState(0);
  const mobileCarouselRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'comments'>('timeline');
  const [relatedReports, setRelatedReports] = useState<Report[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

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

  // Fetch related reports
  useEffect(() => {
    if (report) {
      fetchRelatedReports();
    }
  }, [report?.id, report?.category]);

  const fetchRelatedReports = async () => {
    if (!report) return;
    setLoadingRelated(true);
    try {
      const reports = await reportsService.getReports({
        category: report.category,
        limit: 6
      });
      // Filter out current report and get up to 5 related
      const related = reports
        .filter(r => r.id !== report.id)
        .slice(0, 5) as any[];
      setRelatedReports(related);
    } catch (error) {
      console.error('Error fetching related reports:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  // Reset mobile image index when report changes
  useEffect(() => {
    setMobileImageIndex(0);
  }, [report?.id]);

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

      // Fetch user profile (but may not use it if report is anonymous)
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
        is_liked: userLikes && userLikes.length > 0,
        is_anonymous: reportData.is_anonymous || false // Ensure is_anonymous is included
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
      // Ensure newest first
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
        .order('created_at', { ascending: false });

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
    if (isPending) {
      try { showToastError('Your account is pending verification. You cannot like reports until approved by an admin.', 5000); } catch {};
      return;
    }
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
      const isLiked = await reportsService.toggleLike(report.id);

      setReport(prev => prev ? {
        ...prev,
        is_liked: isLiked,
        likes_count: Math.max(0, (prev.likes_count || 0) + (isLiked ? 1 : -1))
      } : null);
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
    if (isPending) {
      try { showToastError('Your account is pending verification. Commenting is disabled until approval.', 5000); } catch {};
      return;
    }
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
    if (isPending) {
      try { showToastError('Your account is pending verification. You cannot like comments until approved.', 5000); } catch {};
      return;
    }

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
    if (isPending) {
      try { showToastError('Your account is pending verification. Replying is disabled until approval.', 5000); } catch {};
      return;
    }

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
    if (isPending) {
      try { showToastError('Your account is pending verification. Replying is disabled until approval.', 5000); } catch {};
      return;
    }

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
      
      // Helper function to add nested reply recursively
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

      // Add the nested reply to both regular comments and report comments
      setComments(prev => 
        prev.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: addNestedReply(comment.replies || [])
            };
          }
          return comment;
        })
      );

      setReportComments(prev => 
        prev.map(comment => {
          if (comment.id === commentId) {
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
    if (isPending) {
      try { showToastError('Your account is pending verification. You cannot like replies until approved.', 5000); } catch {};
      return;
    }

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
      // Create a helpful user-facing message based on the error
      const raw = (error && (error as any).message) ? (error as any).message : String(error);
      const lower = raw.toLowerCase();
      let userMessage = 'Failed to like/unlike reply. Please try again.';
      if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication')) {
        userMessage = 'Please sign in to like replies.';
      } else if (lower.includes('row-level security') || lower.includes('row-level') || lower.includes('rls')) {
        userMessage = 'Your session does not allow this action. Try signing out and signing in again.';
      } else if (lower.includes('foreign') || lower.includes('constraint') || lower.includes('reply_id')) {
        userMessage = 'This reply cannot be liked due to a data mismatch. Please contact support.';
      }
      try { showToastError(userMessage, 5000); } catch {}
      console.debug('Reply like error details:', { replyId, error: raw });

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

  // Build timeline events for the timeline tab
  const buildTimelineEvents = (): TimelineEvent[] => {
    const timelineEvents: TimelineEvent[] = [];
    
    // Add initial creation event
    timelineEvents.push({
      id: `created-${report.id}`,
      status: 'pending',
      timestamp: report.created_at,
      actor: report.is_anonymous ? undefined : {
        name: report.user.username,
        avatar_url: report.user.avatar_url || undefined
      },
      note: 'Report created'
    });

    // Add events from status_update, assignment, and resolution comments
    reportComments
      .filter(c => ['status_update', 'assignment', 'resolution'].includes(c.comment_type))
      .forEach(comment => {
        let status = report.status;
        if (comment.comment_type === 'status_update') {
          const statusMatch = comment.comment.match(/status[:\s]+(\w+)/i);
          if (statusMatch) {
            status = statusMatch[1] as any;
          }
        } else if (comment.comment_type === 'assignment') {
          status = 'in_progress';
        } else if (comment.comment_type === 'resolution') {
          status = 'resolved';
        }

        timelineEvents.push({
          id: comment.id,
          status: status,
          timestamp: comment.created_at,
          actor: comment.user_profile ? {
            name: comment.user_profile.username,
            avatar_url: comment.user_profile.avatar_url || undefined,
            role: comment.comment_type === 'assignment' ? 'Patrol Officer' : 'Administrator'
          } : undefined,
          note: comment.comment
        });
      });

    // Sort by timestamp (newest first)
    timelineEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return timelineEvents;
  };

  const timelineEvents = buildTimelineEvents();
  const effectiveLevel = getEffectiveLevel(report);

  return (
    <>
      <MobileBackToReports />
      <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <button onClick={() => navigate('/reports')} className="inline-flex items-center gap-1 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </button>
          <span>/</span>
          <span className="text-gray-700 font-medium line-clamp-1">{report.title}</span>
        </div>

      {/* 2-Column Layout: Left (Images + Location), Right (Summary Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left Column: Images + Location */}
        <div className="space-y-6">
          {/* Images Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Images</h2>
            {report.images && report.images.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="mb-4">
                  <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={getImageUrl(report.images[0])}
                      alt={`Report image 1`}
                      className="w-full h-full object-cover cursor-pointer"
                      loading="lazy"
                      onClick={() => setSelectedImage({ url: report.images[0], index: 0 })}
                      onError={(e) => { const imgElement = e.target as HTMLImageElement; imgElement.src = fallbackImageUrl; }}
                    />
        </div>
      </div>
                {/* Thumbnails */}
                {report.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {report.images.slice(1, 5).map((image, index) => (
                      <motion.div
                        key={index + 1}
                        whileHover={{ scale: 1.05 }}
                        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setSelectedImage({ url: image, index: index + 1 })}
                      >
                        <img
                          src={getImageUrl(image)}
                          alt={`Report image ${index + 2}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { const imgElement = e.target as HTMLImageElement; imgElement.src = fallbackImageUrl; }}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-gray-500">
                <span className="text-sm">No images attached</span>
              </div>
            )}
          </motion.div>

          {/* Location Card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-gray-600" />
              Location
            </h3>
            <button
              onClick={async () => {
                const coords = await getReportCoordinates(report as any);
                let url: string;
                if (coords) {
                  url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
                } else {
                  url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.location_address || '')}`;
                }
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              className="text-sm text-gray-700 hover:text-gray-900 hover:underline text-left w-full"
            >
              {report.location_address}
            </button>
          </motion.div>
        </div>

        {/* Right Column: Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 lg:sticky lg:top-24 h-fit"
        >
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{report.title}</h1>
          
          {/* Status and Level Row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
              {formatStatusForDisplay(report.status)}
            </span>
            {typeof effectiveLevel === 'number' && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                effectiveLevel >= 5 ? 'bg-red-100 text-red-800' : 
                effectiveLevel >= 4 ? 'bg-orange-100 text-orange-800' : 
                effectiveLevel >= 3 ? 'bg-yellow-100 text-yellow-800' : 
                effectiveLevel >= 2 ? 'bg-blue-100 text-blue-800' : 
                'bg-green-100 text-green-800'
              }`} title={getServiceLevelText(effectiveLevel)}>
                Level {effectiveLevel} · {getServiceLevelText(effectiveLevel)}
              </span>
            )}
          </div>

          {/* Reporter and Date */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              {report.is_anonymous ? (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center border border-blue-200 flex-shrink-0">
                  <span className="text-blue-600 font-bold text-xs">?</span>
                </div>
              ) : (
                <img 
                  className="h-6 w-6 rounded-full object-cover border border-gray-200 flex-shrink-0" 
                  src={report.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.user.username)}`} 
                  alt={report.user.username}
                />
              )}
              <span>Reported by <span className="font-medium text-gray-900">{report.is_anonymous ? 'Anonymous Reporter' : report.user.username}</span></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
                {report.case_number && (
                  <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Case Number</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center">
                  <Hash className="h-3 w-3 mr-1" />
                  {report.case_number}
                </p>
                  </div>
                )}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Category</p>
              <p className="text-sm font-semibold text-gray-900">{capitalize(report.category || 'N/A')}</p>
            </div>
                {report.assigned_group && (
                  <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Assigned Group</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {report.assigned_group}
                </p>
                  </div>
                )}
                {report.assigned_patroller_name && (
                  <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Assigned Patroller</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {report.assigned_patroller_name}
                </p>
                  </div>
                )}
              </div>

          {/* Location and Service Level */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Location */}
            {report.location_address && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Location</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center">
                  <MapPin className="h-4 w-4 mr-1.5 text-gray-600" />
                  {report.location_address}
                </p>
              </div>
            )}
            
            {/* Service Level */}
            {effectiveLevel !== null && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Service Level</p>
                <p className={`text-sm font-semibold inline-flex items-center px-2.5 py-1 rounded-full ${
                  effectiveLevel >= 5 ? 'bg-red-100 text-red-800' :
                  effectiveLevel >= 4 ? 'bg-orange-100 text-orange-800' :
                  effectiveLevel >= 3 ? 'bg-yellow-100 text-yellow-800' :
                  effectiveLevel >= 2 ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  Level {effectiveLevel} · {getServiceLevelText(effectiveLevel)}
                </p>
                  </div>
                )}
              </div>
            </motion.div>
      </div>

      {/* Report Description Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.3 }}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">Report Description</h2>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">{report.description}</p>
          <div className="flex items-center gap-2 text-sm text-gray-600 pt-4 border-t border-gray-200">
            {report.is_anonymous ? (
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center border border-blue-200 flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs">?</span>
              </div>
            ) : (
              <img 
                className="h-5 w-5 rounded-full object-cover border border-gray-200 flex-shrink-0" 
                src={report.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.user.username)}`} 
                alt={report.user.username}
              />
            )}
            <span>Reported by <span className="font-medium text-gray-900">{report.is_anonymous ? 'Anonymous Reporter' : report.user.username}</span></span>
            <span>•</span>
            <span>{new Date(report.created_at).toLocaleString()}</span>
          </div>
        </div>
      </motion.div>

      {/* Tabbed Interface: Timeline & Logs / Comments */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8"
        ref={commentsSectionRef}
          >
            {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex">
                <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === 'timeline'
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Timeline & Logs ({reportComments.filter(c => c.comment_type !== 'comment').length})
                </button>
                <button
              onClick={() => setActiveTab('comments')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${
                    activeTab === 'comments'
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Comments ({reportComments.filter(c => c.comment_type === 'comment').length})
                </button>
              </div>
              </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'timeline' ? (
            <div className="space-y-6">
              {/* Status Timeline */}
              {timelineEvents.length > 1 && (
                <div>
                  <StatusTimeline 
                    events={timelineEvents} 
                    currentStatus={report.status}
                  />
            </div>
              )}
              
              {/* Officer Updates & Logs */}
              {reportComments.filter(c => c.comment_type !== 'comment').length === 0 ? (
                <div className="text-center py-12">
                  <ShieldCheck className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No officer updates yet</p>
                        </div>
              ) : (
                <div className="space-y-4">
                  {reportComments.filter(c => c.comment_type !== 'comment').map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-l-4 border-blue-500 pl-4 py-2"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                          <ShieldCheck className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue-900">
                              {comment.user_profile?.username || 'Unknown'}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500 text-white">
                              Official
                            </span>
                            {comment.comment_type !== 'comment' && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                comment.comment_type === 'status_update' ? 'bg-blue-100 text-blue-800' :
                                comment.comment_type === 'assignment' ? 'bg-purple-100 text-purple-800' :
                                comment.comment_type === 'resolution' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {comment.comment_type.replace('_', ' ')}
                              </span>
                            )}
        </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mt-2 ml-10">{comment.comment}</p>
                    </motion.div>
                  ))}
                        </div>
                      )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Comments Section */}
              {reportComments.filter(c => c.comment_type === 'comment').length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No comments yet</p>
                  <p className="text-xs text-gray-400 mt-1">Be the first to comment</p>
                </div>
              ) : (
                <div className="space-y-4">
                      {reportComments.filter(c => c.comment_type === 'comment').map((comment, index) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      className={`py-4 ${index !== 0 ? 'border-t border-gray-100' : ''}`}
                      >
                      <div className="flex gap-3">
                            <img
                          className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                              src={comment.user_profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user_profile?.username || 'Unknown')}`}
                              alt={comment.user_profile?.username || 'Unknown'}
                            />
                          <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">
                                  {comment.user_profile?.username || 'Unknown'}
                                </span>
                              </div>
                              {editingCommentId === comment.id ? (
                              <div className="mt-2">
                                  <textarea
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                  rows={3}
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                  />
                                  <div className="mt-2 flex items-center gap-2">
                                  <button onClick={submitEdit} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                                  <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                              <p className="text-sm leading-relaxed text-gray-900">
                                  {comment.comment}
                                </p>
                              )}
                            </div>
                            
                          <div className="flex items-center gap-4 mt-2 ml-2">
                            <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleString('en-US', { 
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleCommentLike(comment.id)} 
                                  disabled={likeLoading}
                                className={`text-xs font-semibold flex items-center gap-1 ${comment.is_liked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'} transition-colors`}
                                >
                                  <Heart className={`h-3 w-3 ${comment.is_liked ? 'fill-current' : ''}`} />
                                Like
                                </button>
                                {comment.likes_count > 0 && (
                                  <button
                                    onClick={() => {
                                      setLikeDetailsModal({ 
                                        isOpen: true, 
                                        commentId: comment.id,
                                        reportTitle: `Comment by ${comment.user_profile?.username}`
                                      });
                                    }}
                                  className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                                  >
                                    {comment.likes_count}
                                  </button>
                                )}
                              </div>
                              <button 
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                              className="text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                Reply
                              </button>
                              {user?.id === comment.user_id && editingCommentId !== comment.id && (
                                <>
                                  <button 
                                    onClick={() => startEdit(comment.id, comment.comment)}
                                  className="text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => requestDelete(comment.id)}
                                  className="text-xs font-semibold text-gray-600 hover:text-red-600 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                            
                          {/* Reply Input */}
                            {replyingTo === comment.id && user && (
                            <div className="mt-3 flex gap-2 ml-2">
                                <img
                                  className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                                  src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`}
                                  alt={user.username}
                                />
                                <div className="flex-1">
                                  <div className="relative">
                                    <textarea 
                                      value={replyContent} 
                                      onChange={(e) => {
                                        setReplyContent(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                      }} 
                                      rows={1}
                                      className="w-full px-3 py-1.5 bg-gray-100 border border-transparent rounded-full focus:bg-white focus:border-gray-300 focus:ring-1 focus:ring-blue-500 text-xs resize-none overflow-hidden transition-all" 
                                      placeholder="Write a reply…"
                                      style={{ minHeight: '28px', maxHeight: '80px' }}
                                    />
                                    {replyContent.trim() && (
                                      <button 
                                        onClick={() => handleReply(comment.id)} 
                                        disabled={submittingReply}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                                      >
                                        {submittingReply ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Send className="h-3 w-3" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                  <button 
                                    onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                                    className="text-[10px] text-gray-500 hover:text-gray-700 mt-1 ml-2"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            
                          {/* Nested Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 ml-2">
                                <button 
                                  onClick={() => setExpandedCommentReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))} 
                                className="text-xs font-semibold text-gray-600 hover:text-gray-800 flex items-center gap-1"
                                >
                                  <Reply className="h-3 w-3" />
                                  {expandedCommentReplies[comment.id] ? 'Hide' : `View`} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                </button>
                                {expandedCommentReplies[comment.id] && (
                                  <div className="mt-2 space-y-2">
                                    <ReplyThread
                                      replies={comment.replies}
                                      commentId={comment.id}
                                      onLike={handleReplyLike}
                                      onReply={handleNestedReply}
                                      likeLoading={commentLikeLoading}
                                      nestedReplyForms={nestedReplyForms}
                                      setNestedReplyForms={setNestedReplyForms}
                                      onShowLikeDetails={(replyId, username) => {
                                        setLikeDetailsModal({
                                          isOpen: true,
                                          replyId: replyId,
                                          reportTitle: `Reply by ${username}`
                                        });
                                      }}
                                      maxDepth={5}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                      ))}
                    </div>
                  )}

              {/* Comment Input */}
                {user && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex gap-3">
                      <img
                      className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`}
                        alt={user.username}
                      />
                      <form onSubmit={handleSubmitComment} className="flex-1">
                        <div className="relative">
                          <textarea
                            value={commentContent}
                            onChange={(e) => {
                              setCommentContent(e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (commentContent.trim() && !submittingComment) {
                                  handleSubmitComment(e as any);
                                }
                              }
                            }}
                            placeholder="Write a comment…"
                          className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-gray-300 focus:ring-1 focus:ring-blue-500 text-sm resize-none overflow-hidden transition-all"
                            ref={commentTextareaRef}
                            rows={1}
                          style={{ minHeight: '44px', maxHeight: '120px' }}
                          />
                          {commentContent.trim() && (
                            <button
                              type="submit"
                              disabled={submittingComment}
                            className="absolute right-2 bottom-2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {submittingComment ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
          </motion.div>

      {/* Related Reports Section */}
      {relatedReports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.5 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Related Reports</h2>
          {loadingRelated ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedReports.map((relatedReport) => (
                    <motion.div
                  key={relatedReport.id}
                      whileHover={{ scale: 1.02 }}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/reports/${relatedReport.id}`)}
                >
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{relatedReport.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className={`px-2 py-0.5 rounded-full ${getStatusColor((relatedReport as any).status)}`}>
                      {formatStatusForDisplay((relatedReport as any).status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{relatedReport.description}</p>
                    </motion.div>
                  ))}
              </div>
            )}
        </motion.div>
      )}

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
                <ArrowUp className="h-5 w-5" />
              </button>
                    </div>
                  </div>
              </div>
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
        <ImageViewer
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageUrl={getImageUrl(selectedImage.url)}
          alt={`Report image ${selectedImage.index + 1}`}
          images={report.images.map(img => getImageUrl(img))}
          currentIndex={selectedImage.index}
          onPrevious={() => {
            const prevIndex = (selectedImage.index - 1 + report.images.length) % report.images.length;
            setSelectedImage({ url: report.images[prevIndex], index: prevIndex });
          }}
          onNext={() => {
            const nextIndex = (selectedImage.index + 1) % report.images.length;
            setSelectedImage({ url: report.images[nextIndex], index: nextIndex });
          }}
          showNavigation={report.images.length > 1}
        />
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
    </>
  );
} 