import React, { useEffect, useState } from 'react';
import { MapPin, Filter, Search, Loader2, Plus } from 'lucide-react';
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
}

const CATEGORIES = ['All', 'Infrastructure', 'Safety', 'Environmental', 'Public Services', 'Other'];
const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES = ['All', 'Low', 'Medium', 'High'];

export function Reports() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'All',
    status: 'All',
    priority: 'All',
  });

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    try {
      // First, fetch all reports
      let query = supabase
        .from('reports')
        .select('*')
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
      
      // Combine reports with user data
      const reportsWithUsers = reportsData.map(report => ({
        ...report,
        user: profilesMap.get(report.user_id) || { username: 'Unknown User', avatar_url: null }
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

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
        <Link
          to="/reports/create"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-color text-white px-4 py-3 rounded-lg hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-color touch-target"
        >
          <Plus className="h-5 w-5" />
          <span>Create New Report</span>
        </Link>
      </div>

      {/* Search and Filters Section */}
      <div className="bg-white shadow rounded-lg mb-4 p-2 sm:p-4">
        {/* Search Bar */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search reports..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-color focus:border-primary-color text-base bg-white text-gray-900 placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-color focus:border-primary-color text-base appearance-none bg-white text-gray-900"
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
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-color focus:border-primary-color text-base appearance-none bg-white text-gray-900"
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
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-color focus:border-primary-color text-base appearance-none bg-white text-gray-900"
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
          <div className="flex flex-col gap-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg p-4 flex flex-col gap-3 shadow-md">
                {/* Report Content */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 break-words">{report.title}</h3>
                  <p className="text-sm text-gray-700 mb-1 break-words line-clamp-3">{report.description}</p>
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>{report.status.replace('_', ' ')}</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(report.priority)}`}>{report.priority}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 break-words">
                    <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
                    <span className="truncate break-words">{report.location_address}</span>
                  </div>
                </div>
                {/* User Info (stacked below on mobile) */}
                <div className="flex items-center gap-3 mt-2">
                  <img
                    className="h-9 w-9 rounded-full object-cover border border-gray-300"
                    src={report.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.user.username)}`}
                    alt={report.user.username}
                  />
                  <div>
                    <div className="text-xs font-medium text-gray-900">{report.user.username}</div>
                    <p className="text-xs text-gray-500">{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {/* Report Images */}
                {report.images && report.images.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {report.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Report image ${index + 1}`}
                        className="h-24 w-full object-cover rounded-md border border-gray-300"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}