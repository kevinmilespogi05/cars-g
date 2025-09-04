import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Clock, AlertCircle, Info, AlertTriangle, Star, Shield, Users, MapPin, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AnnouncementCard, Announcement } from './AnnouncementCard';
import { AnnouncementModal } from './AnnouncementModal';

type PriorityFilter = 'all' | 'low' | 'normal' | 'high' | 'urgent';
type AudienceFilter = 'all' | 'all' | 'users' | 'patrols' | 'admins';
type StatusFilter = 'all' | 'active' | 'expired' | 'expiring_soon';

export function AnnouncementsDisplayOptimized() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try the optimized query first (with foreign key relationship)
      let query = supabase
        .from('announcements')
        .select(`
          *,
          author:profiles!announcements_author_id_fkey(
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      if (audienceFilter !== 'all') {
        query = query.eq('target_audience', audienceFilter);
      }

      const { data, error } = await query;

      if (error) {
        // If the foreign key relationship doesn't exist, fall back to the simple query
        console.warn('Foreign key relationship not found, falling back to simple query:', error);
        
        const { data: simpleData, error: simpleError } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (simpleError) throw simpleError;

        // Fetch author information separately
        const announcementsWithAuthors = await Promise.all(
          (simpleData || []).map(async (announcement) => {
            try {
              const { data: authorData } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', announcement.author_id)
                .single();

              return {
                ...announcement,
                author: authorData || { username: 'Unknown', avatar_url: null }
              };
            } catch (error) {
              console.error('Error fetching author for announcement:', announcement.id, error);
              return {
                ...announcement,
                author: { username: 'Unknown', avatar_url: null }
              };
            }
          })
        );

        setAnnouncements(announcementsWithAuthors);
        return;
      }

      // Apply client-side filters
      let filteredData = data || [];

      // Search filter
      if (search.trim()) {
        const searchTerm = search.toLowerCase();
        filteredData = filteredData.filter(announcement =>
          announcement.title.toLowerCase().includes(searchTerm) ||
          announcement.content.toLowerCase().includes(searchTerm) ||
          announcement.author?.username?.toLowerCase().includes(searchTerm)
        );
      }

      // Status filter
      if (statusFilter !== 'all') {
        const now = new Date();
        filteredData = filteredData.filter(announcement => {
          const isExpired = announcement.expires_at && new Date(announcement.expires_at) < now;
          const isExpiringSoon = announcement.expires_at && 
            new Date(announcement.expires_at) < new Date(now.getTime() + 24 * 60 * 60 * 1000) && 
            new Date(announcement.expires_at) > now;

          switch (statusFilter) {
            case 'active':
              return announcement.is_active && !isExpired;
            case 'expired':
              return isExpired;
            case 'expiring_soon':
              return isExpiringSoon;
            default:
              return true;
          }
        });
      }

      setAnnouncements(filteredData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch announcements');
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [priorityFilter, audienceFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnnouncements();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handleViewAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
  };

  const getFilterCounts = () => {
    const now = new Date();
    return {
      total: announcements.length,
      active: announcements.filter(a => a.is_active && (!a.expires_at || new Date(a.expires_at) > now)).length,
      expired: announcements.filter(a => a.expires_at && new Date(a.expires_at) < now).length,
      expiringSoon: announcements.filter(a => {
        if (!a.expires_at) return false;
        const expiresAt = new Date(a.expires_at);
        return expiresAt < new Date(now.getTime() + 24 * 60 * 60 * 1000) && expiresAt > now;
      }).length
    };
  };

  const counts = getFilterCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
          <p className="text-gray-600">Stay updated with the latest news and updates</p>
        </div>
        <button
          onClick={fetchAnnouncements}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search announcements..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Audience Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value as AudienceFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Audiences</option>
              <option value="all">Everyone</option>
              <option value="users">Users</option>
              <option value="patrols">Patrols</option>
              <option value="admins">Admins</option>
            </select>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              Active ({counts.active})
            </button>
            <button
              onClick={() => setStatusFilter('expiring_soon')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'expiring_soon'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              Expiring Soon ({counts.expiringSoon})
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'expired'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              Expired ({counts.expired})
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading announcements...</span>
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <Info className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements found</h3>
          <p className="text-gray-600">
            {search || priorityFilter !== 'all' || audienceFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : 'There are no announcements available at the moment.'}
          </p>
        </div>
      ) : (
        /* Announcements Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onView={handleViewAnnouncement}
            />
          ))}
        </div>
      )}

      {/* Full Display Modal */}
      {selectedAnnouncement && (
        <AnnouncementModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}
    </div>
  );
}
