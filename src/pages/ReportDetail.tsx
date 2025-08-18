import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Heart, MessageCircle, Send, Loader2, ChevronLeft, ChevronRight, ArrowLeft, X, Reply } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { LikeDetailsModal } from '../components/LikeDetailsModal';
import { Comment, CommentReply } from '../types';
import { reportsService } from '../services/reportsService';
import { ReplyThread } from '../components/ReplyThread';

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
}

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; index: number } | null>(null);
  const [likeDetailsModal, setLikeDetailsModal] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [commentLikeLoading, setCommentLikeLoading] = useState<{ [key: string]: boolean }>({});
  const [nestedReplyForms, setNestedReplyForms] = useState<{ [key: string]: { content: string; submitting: boolean } }>({});

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
    }
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
          comments:comments(count)
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

      setReport({
        ...reportData,
        user: profileData,
        likes_count: reportData.likes?.[0]?.count || 0,
        comments_count: reportData.comments?.[0]?.count || 0,
        is_liked: userLikes && userLikes.length > 0
      });
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
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
      const { error } = await supabase
        .from('comments')
        .insert({
          report_id: report.id,
          user_id: user.id,
          content: commentContent.trim()
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Comment submitted successfully');
      // Refresh comments and update comment count
      await fetchComments();
      
      // Update the report's comment count
      setReport(prev => prev ? {
        ...prev,
        comments_count: prev.comments_count + 1
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
      
      // Update the comment's like status and count
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
    } catch (error) {
      console.error('Error toggling comment like:', error);
      alert('Failed to like/unlike comment. Please try again.');
    } finally {
      setCommentLikeLoading(prev => ({ ...prev, [commentId]: false }));
    }
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
      
      // Add the reply to the comment
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
      // Optimistic update
      let previousState: CommentReply | null = null;
      setComments(prev => 
        prev.map(comment => {
          const updateReplyLikes = (replies: CommentReply[]): CommentReply[] => {
            return replies.map(reply => {
              if (reply.id === replyId) {
                previousState = { ...reply };
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

          return {
            ...comment,
            replies: updateReplyLikes(comment.replies || [])
          };
        })
      );

      // Call API
      const isLiked = await reportsService.toggleReplyLike(replyId);
      // If server result disagrees with optimistic toggle, adjust
      if (previousState && previousState.is_liked === isLiked) {
        // No change needed
      } else if (previousState) {
        setComments(prev => 
          prev.map(comment => {
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
            return { ...comment, replies: fixReplies(comment.replies || []) };
          })
        );
      }
    } catch (error) {
      console.error('Error toggling reply like:', error);
      alert('Failed to like/unlike reply. Please try again.');
      // Rollback optimistic update
      setComments(prev => 
        prev.map(comment => {
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
          return { ...comment, replies: rollback(comment.replies || []) };
        })
      );
    } finally {
      setCommentLikeLoading(prev => ({ ...prev, [replyId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/reports')}
        className="text-primary-color hover:text-primary-dark mb-6"
      >
        <ArrowLeft className="h-5 w-5 inline mr-2" />
        Back to Reports
      </button>

      {/* Report Content */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{report.title}</h1>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
            {report.status.replace('_', ' ')}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(report.priority)}`}>
            {report.priority}
          </span>
        </div>

        <p className="text-gray-700 mb-4 whitespace-pre-wrap">{report.description}</p>

        <div className="flex items-center text-sm text-gray-700 mb-6">
          <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0 text-gray-700" />
          <span>{report.location_address}</span>
        </div>

        {/* Images */}
        {report.images && report.images.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Images</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {report.images.map((image, index) => (
                <div
                  key={index}
                  className="relative aspect-square cursor-pointer overflow-hidden bg-gray-100 rounded-lg"
                  onClick={() => setSelectedImage({ url: image, index })}
                >
                  <img
                    src={getImageUrl(image)}
                    alt={`Report image ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover rounded-lg border border-gray-200"
                    loading="eager"
                    decoding="sync"
                    fetchpriority="high"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      console.error(`Failed to load image: ${image}`);
                      const imgElement = e.target as HTMLImageElement;
                      imgElement.src = fallbackImageUrl;
                    }}
                    style={{ backgroundColor: '#f0f0f0' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Info and Interactions */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="flex items-center gap-3">
            <img
              className="h-10 w-10 rounded-full object-cover border border-gray-200"
              src={report.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.user.username)}`}
              alt={report.user.username}
            />
            <div>
              <div className="text-sm font-medium text-gray-900">{report.user.username}</div>
              <p className="text-xs text-gray-700">{new Date(report.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`text-sm ${
                  report.is_liked ? 'text-red-500' : 'text-gray-700 hover:text-red-500'
                } transition-colors`}
              >
                <Heart className={`h-5 w-5 ${report.is_liked ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => {
                  if (report.likes_count > 0) {
                    setLikeDetailsModal({
                      isOpen: true,
                      reportId: report.id,
                      reportTitle: report.title
                    });
                  }
                }}
                className={`text-sm transition-colors ${
                  report.likes_count > 0
                    ? 'text-gray-700 hover:text-gray-900 cursor-pointer'
                    : 'text-gray-400 cursor-default'
                }`}
                disabled={report.likes_count === 0}
              >
                {report.likes_count}
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-700">
              <MessageCircle className="h-5 w-5" />
              <span>{report.comments_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Comments</h2>

        {/* Comment Form */}
        {user && (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Write a comment..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-primary-color focus:border-primary-color text-base bg-white text-gray-900 placeholder-gray-400 resize-none"
              rows={3}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={submittingComment || !commentContent.trim()}
                className="px-4 py-2 bg-primary-color text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingComment ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Post Comment'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3">
                <img
                  className="h-8 w-8 rounded-full object-cover border border-gray-200"
                  src={comment.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.username)}`}
                  alt={comment.user.username}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{comment.user.username}</span>
                    <span className="text-xs text-gray-700">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  
                  {/* Comment Actions */}
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => handleCommentLike(comment.id)}
                      disabled={commentLikeLoading[comment.id]}
                      className={`flex items-center gap-1 text-sm transition-colors ${
                        comment.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      {commentLikeLoading[comment.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Heart className={`h-4 w-4 ${comment.is_liked ? 'fill-current' : ''}`} />
                      )}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if ((comment.likes_count || 0) > 0) {
                            setLikeDetailsModal({
                              isOpen: true,
                              // @ts-ignore
                              commentId: comment.id,
                              reportId: '' as any,
                              reportTitle: ''
                            } as any);
                          }
                        }}
                        className={(comment.likes_count || 0) > 0 ? 'cursor-pointer' : ''}
                      >
                        {comment.likes_count || 0}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Reply className="h-4 w-4" />
                      <span>Reply</span>
                      {comment.replies_count > 0 && (
                        <span className="text-xs">({comment.replies_count})</span>
                      )}
                    </button>
                  </div>

                  {/* Reply Form */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-primary-color focus:border-primary-color text-sm bg-white text-gray-900 placeholder-gray-400 resize-none"
                        rows={2}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReply(comment.id)}
                          disabled={submittingReply || !replyContent.trim()}
                          className="px-3 py-1 bg-primary-color text-white text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submittingReply ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Reply'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3">
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && report.images && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={getImageUrl(selectedImage.url)}
              alt={`Report image ${selectedImage.index + 1}`}
              className="max-h-[85vh] max-w-full object-contain rounded-lg bg-gray-100"
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
          contextLabel={
            likeDetailsModal.replyId ? 'People who liked this reply' :
            likeDetailsModal.commentId ? 'People who liked this comment' :
            (likeDetailsModal.reportTitle ? `People who liked "${likeDetailsModal.reportTitle}"` : 'Likes')
          }
        />
      )}
    </div>
  );
} 