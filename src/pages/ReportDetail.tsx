import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Heart, MessageCircle, Send, Loader2, ChevronLeft, ChevronRight, ArrowLeft, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
}

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

      // Combine comments with user data
      const commentsWithUsers = commentsData.map(comment => ({
        ...comment,
        user: profilesMap.get(comment.user_id) || { username: 'Unknown User', avatar_url: null }
      }));

      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !report) return;
    
    setLikeLoading(true);
    try {
      if (report.is_liked) {
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
    } finally {
      setLikeLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !report || !commentContent.trim()) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          report_id: report.id,
          user_id: user.id,
          content: commentContent.trim()
        });

      if (error) throw error;

      // Refresh comments
      await fetchComments();
      setCommentContent('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
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
      <div className="max-w-3xl mx-auto px-4 py-8">
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
    <div className="max-w-3xl mx-auto px-4 py-8">
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
              <p className="text-xs text-gray-700">{new Date(report.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className={`flex items-center gap-1.5 text-sm ${
                report.is_liked ? 'text-red-500' : 'text-gray-700 hover:text-red-500'
              } transition-colors`}
            >
              <Heart className={`h-5 w-5 ${report.is_liked ? 'fill-current' : ''}`} />
              <span>{report.likes_count}</span>
            </button>
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
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
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
    </div>
  );
} 