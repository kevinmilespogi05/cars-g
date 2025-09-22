import React from 'react';
import { Calendar, User, Eye, Clock, AlertCircle, Info, AlertTriangle, Star } from 'lucide-react';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  author_id: string;
  author?: {
    username: string;
    avatar_url?: string;
  };
  is_active: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_audience: 'all' | 'users' | 'patrols' | 'admins';
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

interface AnnouncementCardProps {
  announcement: Announcement;
  onView: (announcement: Announcement) => void;
  showAuthor?: boolean;
}

export function AnnouncementCard({ announcement, onView, showAuthor = true }: AnnouncementCardProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'normal':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'low':
        return <Star className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTargetAudienceColor = (audience: string) => {
    switch (audience) {
      case 'admins':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'patrols':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'users':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'all':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isExpired = announcement.expires_at && new Date(announcement.expires_at) < new Date();
  const isExpiringSoon = announcement.expires_at && 
    new Date(announcement.expires_at) < new Date(Date.now() + 24 * 60 * 60 * 1000) && 
    new Date(announcement.expires_at) > new Date();

  const imageUrls = (announcement.image_url || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${
        isExpired ? 'opacity-60' : ''
      }`}
      onClick={() => onView(announcement)}
    >
      {/* Image */}
      {imageUrls.length > 0 && (
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          <img
            src={imageUrls[0]}
            alt={announcement.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          {isExpired && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">Expired</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {announcement.title}
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(announcement);
            }}
            className="ml-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View full announcement"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {announcement.content}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
            {getPriorityIcon(announcement.priority)}
            {announcement.priority}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTargetAudienceColor(announcement.target_audience)}`}>
            {announcement.target_audience}
          </span>
          {isExpiringSoon && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
              <Clock className="w-3 h-3" />
              Expires Soon
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {showAuthor && announcement.author && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{announcement.author.username}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <Eye className="w-3 h-3" />
            <span>View</span>
          </div>
        </div>
      </div>
    </div>
  );
}
