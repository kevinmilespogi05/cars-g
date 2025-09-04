import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, AlertCircle, Info, AlertTriangle, CheckCircle, Save, X, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { cloudinary } from '../lib/cloudinary';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_audience: 'all' | 'users' | 'patrols' | 'admins';
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  author_id: string;
}

interface AnnouncementFormData {
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_audience: 'all' | 'users' | 'patrols' | 'admins';
  expires_at: string;
  image_url: string;
}

export function AnnouncementManagement() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    content: '',
    priority: 'normal',
    target_audience: 'all',
    expires_at: '',
    image_url: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        return;
      }

      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    setUploadingImage(true);
    try {
      const result = await cloudinary.uploadImage(file, 'announcements');
      return result.secureUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      let imageUrl = formData.image_url;

      // Upload new image if one was selected
      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile);
      }

      const announcementData = {
        title: formData.title,
        content: formData.content,
        image_url: imageUrl,
        priority: formData.priority,
        target_audience: formData.target_audience,
        author_id: user.id,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_active: true
      };

      if (editingId) {
        // Update existing announcement
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Create new announcement
        const { error } = await supabase
          .from('announcements')
          .insert(announcementData);

        if (error) throw error;
      }

      await fetchAnnouncements();
      resetForm();
    } catch (error) {
      console.error('Error saving announcement:', error);
      alert('Failed to save announcement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      target_audience: announcement.target_audience,
      expires_at: announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : '',
      image_url: announcement.image_url || ''
    });
    setImagePreview(announcement.image_url || '');
    setImageFile(null);
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement. Please try again.');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      await fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement status:', error);
      alert('Failed to update announcement status. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      target_audience: 'all',
      expires_at: '',
      image_url: ''
    });
    setImageFile(null);
    setImagePreview('');
    setEditingId(null);
    setShowForm(false);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'normal':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
          <p className="text-sm text-gray-600">Manage system announcements for users and patrols</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingId ? 'Edit Announcement' : 'Create New Announcement'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Users</option>
                  <option value="users">Users Only</option>
                  <option value="patrols">Patrols Only</option>
                  <option value="admins">Admins Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expires At (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image (Optional)
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {imageFile ? 'Change Image' : 'Upload Image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                        setFormData(prev => ({ ...prev, image_url: '' }));
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="text-white text-sm">Uploading...</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {submitting ? 'Saving...' : (editingId ? 'Update' : 'Create')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {announcements.length === 0 ? (
          <div className="text-center py-8">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements</h3>
            <p className="text-gray-600">Create your first announcement to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(announcement.priority)}
                        <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {announcement.target_audience}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${announcement.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {announcement.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {announcement.image_url && (
                      <div className="mb-2">
                        <img
                          src={announcement.image_url}
                          alt={announcement.title}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                      {announcement.expires_at && (
                        <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(announcement.id, announcement.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        announcement.is_active 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={announcement.is_active ? 'Hide announcement' : 'Show announcement'}
                    >
                      {announcement.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit announcement"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
