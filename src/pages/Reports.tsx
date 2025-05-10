import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Filter, Search, Loader2, Plus, X, ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  location_address: string;
  created_at: string;
  user_id: string;
  user: {
    username: string;
    avatar_url: string;
  };
  images: string[];
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

const CATEGORIES = ['All', 'Infrastructure', 'Safety', 'Environmental', 'Public Services', 'Other'];
const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES = ['All', 'Low', 'Medium', 'High'];

export function Reports() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'All',
    status: 'All',
    priority: 'All',
  });
  const [selectedImage, setSelectedImage] = useState<{ url: string; index: number } | null>(null);
  const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>({});
  const [likeLoading, setLikeLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    try {
      // First, fetch all reports with likes and comments count
      let query = supabase
        .from('reports')
        .select(`
          *,
          likes:likes(count),
          comments:comments(count)
        `)
        .order('created_at', { ascending: false });

      if (filters.category !== 'All') {
        query = query.eq('category', filters.category.toLowerCase());
      }
      if (filters.status !== 'All') {
        query = query.eq('status', filters.status.toLowerCase().replace(' ', '_'));
      }
      if (filters.priority !== 'All') {
        query = query.eq('priority', filters.priority.toLowerCase());
      }

      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;
      
      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }
      
      // Then, fetch user profiles for all reports
      const userIds = [...new Set(reportsData.map(report => report.user_id))];
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

      // Fetch user's likes for all reports
      const { data: userLikes, error: likesError } = await supabase
        .from('likes')
        .select('report_id')
        .eq('user_id', user?.id);

      if (likesError) throw likesError;

      const likedReportIds = new Set(userLikes?.map(like => like.report_id));
      
      // Combine reports with user data and likes/comments count
      const reportsWithUsers = reportsData.map(report => ({
        ...report,
        user: profilesMap.get(report.user_id) || { username: 'Unknown User', avatar_url: null },
        likes_count: report.likes?.[0]?.count || 0,
        comments_count: report.comments?.[0]?.count || 0,
        is_liked: likedReportIds.has(report.id)
      }));
      
      setReports(reportsWithUsers);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.location_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleImageClick = (imageUrl: string, index: number) => {
    setSelectedImage({ url: imageUrl, index });
  };

  const handleNextImage = (currentImages: string[]) => {
    if (!selectedImage) return;
    const nextIndex = (selectedImage.index + 1) % currentImages.length;
    setSelectedImage({ url: currentImages[nextIndex], index: nextIndex });
  };

  const handlePrevImage = (currentImages: string[]) => {
    if (!selectedImage) return;
    const prevIndex = (selectedImage.index - 1 + currentImages.length) % currentImages.length;
    setSelectedImage({ url: currentImages[prevIndex], index: prevIndex });
  };

  const handleLike = async (reportId: string) => {
    if (!user) return;
    
    setLikeLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      if (report.is_liked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('report_id', reportId)
          .eq('user_id', user.id);

        if (error) throw error;

        setReports(prev => prev.map(r => 
          r.id === reportId 
            ? { ...r, is_liked: false, likes_count: r.likes_count - 1 }
            : r
        ));
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({ report_id: reportId, user_id: user.id });

        if (error) throw error;

        setReports(prev => prev.map(r => 
          r.id === reportId 
            ? { ...r, is_liked: true, likes_count: r.likes_count + 1 }
            : r
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLikeLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#800000]">Reports</h1>
        <Link
          to="/reports/create"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-color text-white px-4 py-3 rounded-lg shadow hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-color touch-target"
        >
          <Plus className="h-5 w-5" />
          <span>Create New Report</span>
        </Link>
      </div>

      {/* Search and Filters Section */}
      <div className="bg-white shadow-md rounded-xl mb-6 p-4 border border-gray-100">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search reports..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-primary-color focus:border-primary-color text-base bg-gray-50 text-gray-900 placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-primary-color focus:border-primary-color text-base appearance-none bg-gray-50 text-gray-900"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-primary-color focus:border-primary-color text-base appearance-none bg-gray-50 text-gray-900"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-primary-color focus:border-primary-color text-base appearance-none bg-gray-50 text-gray-900"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary-color" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No reports found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl p-6 flex flex-col gap-3 shadow border border-gray-100 transition hover:shadow-lg cursor-pointer"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <Link to={`/reports/${report.id}`} className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 break-words">{report.title}</h3>
                  <p className="text-sm text-gray-600 mb-1 break-words line-clamp-3">{report.description}</p>
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>{report.status.replace('_', ' ')}</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(report.priority)}`}>{report.priority}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 break-words">
                    <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
                    <span className="truncate break-words">{report.location_address}</span>
                  </div>
                </Link>

                {/* User Info and Interactions */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <img
                      className="h-9 w-9 rounded-full object-cover border border-gray-200"
                      src={report.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.user.username)}`}
                      alt={report.user.username}
                    />
                    <div>
                      <div className="text-xs font-medium text-gray-900">{report.user.username}</div>
                      <p className="text-xs text-gray-500">{new Date(report.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleLike(report.id);
                      }}
                      disabled={likeLoading[report.id]}
                      className={`flex items-center gap-1.5 text-sm ${
                        report.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      } transition-colors`}
                    >
                      <Heart className={`h-5 w-5 ${report.is_liked ? 'fill-current' : ''}`} />
                      <span>{report.likes_count}</span>
                    </button>
                    <Link
                      to={`/reports/${report.id}`}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>{report.comments_count}</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X className="h-8 w-8" />
          </button>
          <button
            onClick={() => handlePrevImage(reports.find(r => r.images.includes(selectedImage.url))?.images || [])}
            className="absolute left-4 text-white hover:text-gray-300"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={() => handleNextImage(reports.find(r => r.images.includes(selectedImage.url))?.images || [])}
            className="absolute right-4 text-white hover:text-gray-300"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          <img
            src={selectedImage.url}
            alt="Selected report image"
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        </div>
      )}
    </div>
  );
}