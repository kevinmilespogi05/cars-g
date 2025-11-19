import React from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Award, 
  Lock, 
  Calendar,
  Mail,
  MapPin,
  CheckCircle,
  Star,
  BarChart3,
  TrendingUp,
  FileText,
  Eye,
  X,
  Search,
  Filter,
  X as XIcon,
  Smartphone,
  Info,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Report } from '../types';
import { AchievementsPanel } from './AchievementsPanel';
import { useImageViewerStore } from '../store/imageViewerStore';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedRequest } from '../lib/jwt';
import { NotificationPreferences } from './ui/NotificationPreferences';
import { AnalyticsDashboard } from './ui/AnalyticsDashboard';

interface ProfileTabContentProps {
  activeTab: string;
  user: any;
  isOwnProfile: boolean;
  userStats: any;
  notificationSettings: any;
  onNotificationToggle: (type: 'email' | 'push') => void;
  myReports?: Report[];
  myResolvedReports?: Report[];
  loadingMyReports?: boolean;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  statusFilter?: string;
  setStatusFilter?: (filter: string) => void;
  clearFilters?: () => void;
  filteredReports?: Report[];
  setDeleteTarget?: (report: Report | null) => void;
  onUserUpdate?: (updatedUser: any) => void;
}

export function ProfileTabContent({
  activeTab,
  user,
  isOwnProfile,
  userStats,
  notificationSettings,
  onNotificationToggle,
  myReports = [],
  myResolvedReports = [],
  loadingMyReports = false,
  searchQuery = '',
  setSearchQuery = () => {},
  statusFilter = '',
  setStatusFilter = () => {},
  clearFilters = () => {},
  filteredReports = [],
  setDeleteTarget = () => {},
  onUserUpdate = () => {}
}: ProfileTabContentProps) {
  const navigate = useNavigate();
  const { isAdminLike } = useAuthStore();
  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
  
  // Lightbox state
  const { isImageViewerOpen, setIsImageViewerOpen } = useImageViewerStore();
  const [lightboxImages, setLightboxImages] = React.useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const [lightboxReportTitle, setLightboxReportTitle] = React.useState('');

  // Keyboard support for lightbox
  React.useEffect(() => {
    if (!isImageViewerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImageViewerOpen(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageViewerOpen, lightboxImages.length]);

  // Function to open lightbox
  const openLightbox = (images: string[], index: number, reportTitle: string) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxReportTitle(reportTitle);
    setIsImageViewerOpen(true);
  };

  function PhoneEditor({ initialValue }: { initialValue: string }) {
    const [value, setValue] = React.useState<string>(initialValue ? `+63 ${initialValue.replace(/[\s-]/g, '').slice(3)}` : '+63 ');
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');
    const [editing, setEditing] = React.useState(false);

    const normalize = (rawInput: string) => {
      let raw = rawInput.replace(/[\s-]/g, '');
      if (/^0\d{10}$/.test(raw)) raw = '+63' + raw.slice(1);
      else if (/^63\d{10}$/.test(raw)) raw = '+' + raw;
      raw = raw.replace(/[^+\d]/g, '');
      if (!raw.startsWith('+63')) {
        const digits = raw.replace(/\D/g, '');
        raw = '+63' + digits.slice(0, 10);
      } else {
        const tail = raw.slice(3).replace(/\D/g, '').slice(0, 10);
        raw = '+63' + tail;
      }
      // Return with space for display
      return raw.length >= 3 ? `+63 ${raw.slice(3)}` : '+63 ';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSuccess('');
      const next = normalize(e.target.value);
      setValue(next);
      const ok = /^\+63\s\d{10}$/.test(next);
      setError(ok || next === '+63 ' ? '' : 'Enter a valid PH mobile: +63 9XXXXXXXXX');
    };

    const handleSave = async () => {
      try {
        setSaving(true);
        setError('');
        setSuccess('');
        const ok = /^\+63\s\d{10}$/.test(value) || value === '+63 ';
        if (!ok) {
          setError('Enter a valid PH mobile: +63 9XXXXXXXXX');
          setSaving(false);
          return;
        }
        // Normalize to +639######### for server
        const serverPhone = value === '+63 ' ? '' : '+63' + value.slice(4);
        const resp = await authenticatedRequest('/api/auth/me', {
          method: 'PUT',
          body: JSON.stringify({ phone: serverPhone })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Failed to save');
        setSuccess('Saved');
        setEditing(false);
        
        // Update the parent component with the new user data
        onUserUpdate({ ...user, phone: serverPhone });
      } catch (e: any) {
        setError(e?.message || 'Failed to save');
      } finally {
        setSaving(false);
      }
    };

    React.useEffect(() => {
      if (!initialValue) return;
      const clean = initialValue.replace(/[\s-]/g, '');
      if (/^\+63\d{10}$/.test(clean)) {
        setValue(`+63 ${clean.slice(3)}`);
      }
    }, [initialValue]);

    // If no initial phone passed, fetch the current user's phone via Supabase
    React.useEffect(() => {
      const run = async () => {
        if (initialValue) return;
        try {
          const { data: auth } = await supabase.auth.getUser();
          const uid = auth?.user?.id;
          if (!uid) return;
          const { data } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', uid)
            .maybeSingle();
          const phone = (data as any)?.phone as string | undefined;
          if (phone && /^\+63\d{10}$/.test(phone)) {
            setValue(`+63 ${phone.slice(3)}`);
          }
        } catch {}
      };
      run();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div>
        {!editing ? (
          <div className="flex items-center gap-3">
            <p className="text-green-900 font-medium">{/^\+63\s\d{10}$/.test(value) ? value : 'Not set'}</p>
            <button 
              onClick={() => setEditing(true)} 
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold hover:from-green-700 hover:to-emerald-700 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Edit phone number"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="tel"
              value={value}
              onChange={handleChange}
              maxLength={14}
              className="w-full px-4 py-3 bg-white/80 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm"
              placeholder="+63 9XXXXXXXXX"
            />
            <button
              onClick={handleSave}
              disabled={!!error || saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
              aria-label={saving ? 'Saving phone number' : 'Save phone number'}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={() => { setEditing(false); setError(''); setSuccess(''); }}
              className="px-4 py-2.5 rounded-xl bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Cancel phone editing"
            >
              Cancel
            </button>
          </div>
        )}
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>
    );
  }

  function EditableName({ initialValue, field }: { initialValue: string; field: 'first_name' | 'last_name' }) {
    const [value, setValue] = React.useState(initialValue);
    const [editing, setEditing] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    const handleSave = async () => {
      try {
        setSaving(true);
        setError('');
        setSuccess('');
        
        if (value.trim() === '') {
          setError('Name cannot be empty');
          setSaving(false);
          return;
        }
        
        const resp = await authenticatedRequest('/api/auth/me', {
          method: 'PUT',
          body: JSON.stringify({ [field]: value.trim() })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Failed to save');
        setSuccess('Saved');
        setEditing(false);
        
        // Update the parent component with the new user data
        onUserUpdate({ ...user, [field]: value.trim() });
      } catch (e: any) {
        setError(e?.message || 'Failed to save');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div>
        {!editing ? (
          <div className="flex items-center gap-3">
            <p className="text-blue-900 font-medium">{value || 'Not set'}</p>
            <button 
              onClick={() => setEditing(true)} 
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label={`Edit ${field.replace('_', ' ')}`}
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); setSuccess(''); }}
              className="w-full px-4 py-3 bg-white/80 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
              placeholder={`Enter ${field.replace('_', ' ')}`}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
              aria-label={saving ? `Saving ${field.replace('_', ' ')}` : `Save ${field.replace('_', ' ')}`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={() => { setEditing(false); setValue(initialValue); setError(''); setSuccess(''); }}
              className="px-4 py-2.5 rounded-xl bg-gray-500 text-white font-semibold hover:bg-gray-600 hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Cancel editing"
            >
              Cancel
            </button>
          </div>
        )}
        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-1">{success}</p>}
      </div>
    );
  }

  function EditableUsername({ initialValue }: { initialValue: string }) {
    const [value, setValue] = React.useState(initialValue);
    const [editing, setEditing] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    const handleSave = async () => {
      try {
        setSaving(true);
        setError('');
        setSuccess('');
        
        if (value.trim() === '') {
          setError('Username cannot be empty');
          setSaving(false);
          return;
        }
        
        const resp = await authenticatedRequest('/api/auth/me', {
          method: 'PUT',
          body: JSON.stringify({ username: value.trim() })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Failed to save');
        setSuccess('Saved');
        setEditing(false);
        
        // Update the parent component with the new user data
        onUserUpdate({ ...user, username: value.trim() });
      } catch (e: any) {
        setError(e?.message || 'Failed to save');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div>
        {!editing ? (
          <div className="flex items-center gap-3">
            <p className="text-blue-900 font-medium">{value || 'Not set'}</p>
            <button 
              onClick={() => setEditing(true)} 
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Edit username"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); setSuccess(''); }}
              className="w-full px-4 py-3 bg-white/80 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
              placeholder="Enter username"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
              aria-label={saving ? 'Saving username' : 'Save username'}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={() => { setEditing(false); setValue(initialValue); setError(''); setSuccess(''); }}
              className="px-4 py-2.5 rounded-xl bg-gray-500 text-white font-semibold hover:bg-gray-600 hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Cancel editing"
            >
              Cancel
            </button>
          </div>
        )}
        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-1">{success}</p>}
      </div>
    );
  }

  function EditableEmail({ initialValue }: { initialValue: string }) {
    const [value, setValue] = React.useState<string>(initialValue || '');
    const [editing, setEditing] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    const handleSave = async () => {
      try {
        setSaving(true);
        setError('');
        setSuccess('');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          setError('Enter a valid email address');
          setSaving(false);
          return;
        }
        const resp = await authenticatedRequest('/api/auth/me', {
          method: 'PUT',
          body: JSON.stringify({ email: value })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Failed to save');
        setSuccess('Saved');
        setEditing(false);
        
        // Update the parent component with the new user data
        onUserUpdate({ ...user, email: value });
      } catch (e: any) {
        setError(e?.message || 'Failed to save');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div>
        {!editing ? (
          <div className="flex items-center gap-3">
            <p className="text-blue-900 font-medium">{value || 'Not set'}</p>
            <button 
              onClick={() => setEditing(true)} 
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Edit email address"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); setSuccess(''); }}
              className="w-full px-4 py-3 bg-white/80 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
              placeholder="name@example.com"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
              aria-label={saving ? 'Saving email' : 'Save email'}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={() => { setEditing(false); setError(''); setSuccess(''); setValue(initialValue || ''); }}
              className="px-4 py-2.5 rounded-xl bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Cancel email editing"
            >
              Cancel
            </button>
          </div>
        )}
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'verifying':
        return 'bg-purple-100 text-purple-800';
      case 'awaiting_verification':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Not available';
    }
  };

  const renderOverview = () => (
    <div className="p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
          <User className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Profile Overview</h3>
          <p className="text-sm sm:text-base text-gray-600">Your account information and activity summary</p>
        </div>
      </div>

      {/* Visual Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6 sm:mb-8"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Profile Information Card */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Personal Information
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">First Name</p>
                  {isOwnProfile ? (
                    <EditableName initialValue={user?.first_name || ''} field="first_name" />
                  ) : (
                    <p className="font-medium text-gray-900">{user?.first_name || 'Not set'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Last Name</p>
                  {isOwnProfile ? (
                    <EditableName initialValue={user?.last_name || ''} field="last_name" />
                  ) : (
                    <p className="font-medium text-gray-900">{user?.last_name || 'Not set'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Username</p>
                  {isOwnProfile ? (
                    <EditableUsername initialValue={user?.username || ''} />
                  ) : (
                    <p className="font-medium text-gray-900">{user?.username || 'Not set'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Email</p>
                  {isOwnProfile ? (
                    <EditableEmail initialValue={user?.email || ''} />
                  ) : (
                    <p className="font-medium text-gray-900">{user?.email || 'Not set'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Phone</p>
                  {isOwnProfile ? (
                    <PhoneEditor initialValue={user?.phone || ''} />
                  ) : (
                    <p className="font-medium text-gray-900">{user?.phone || 'Not set'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-medium text-gray-900">{formatDate(user?.created_at)}</p>
                </div>
              </div>
              {isAdminLike(user?.role) && (
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Account Type</p>
                    <p className="font-medium text-purple-900 capitalize">{user.role}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Card */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                Quick Stats
              </h4>
              <div className="relative">
                <button
                  onClick={() => setShowTooltip(showTooltip === 'overview-stats' ? null : 'overview-stats')}
                  className="p-1.5 rounded-lg hover:bg-green-100 transition-colors"
                  aria-label="Statistics information"
                >
                  <HelpCircle className="w-4 h-4 text-green-600" />
                </button>
                <AnimatePresence>
                  {showTooltip === 'overview-stats' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-10"
                      role="tooltip"
                    >
                      <p className="font-semibold mb-1">About Your Stats</p>
                      <p className="text-gray-300">Track your contributions and activity within the community platform.</p>
                      <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {user?.role === 'patrol' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">{userStats.patrol_level}</div>
                  <div className="text-sm text-green-700">Patrol Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">{userStats.patrol_experience_points}</div>
                  <div className="text-sm text-green-700">Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">{userStats.patrol_reports_accepted}</div>
                  <div className="text-sm text-green-700">Accepted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">{userStats.patrol_reports_completed}</div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">{user?.points || 0}</div>
                  <div className="text-sm text-green-700">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">{userStats.reports_submitted}</div>
                  <div className="text-sm text-green-700">Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">{userStats.reports_verified}</div>
                  <div className="text-sm text-green-700">Verified</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">{userStats.reports_resolved}</div>
                  <div className="text-sm text-green-700">Resolved</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReports = () => {
    const isPatrolUser = user?.role === 'patrol';
    const reportsToShow = isPatrolUser ? myResolvedReports : myReports;
    const reportsTitle = isPatrolUser ? 'My Resolved Reports' : (isOwnProfile ? 'My Reports' : `${user?.username || 'User'}'s Reports`);
    const reportsDescription = isPatrolUser 
      ? 'Track your completed patrol assignments' 
      : (isOwnProfile ? 'Manage and track your submitted reports' : 'View reports submitted by this user');

    // Create filtered reports for patrol users
    const patrolFilteredReports = isPatrolUser ? (() => {
      let filtered = myResolvedReports || [];

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(report => 
          report.title.toLowerCase().includes(query) ||
          report.description.toLowerCase().includes(query)
        );
      }

      // Apply status filter (for patrol, we only show resolved, but allow filtering by other criteria)
      if (statusFilter) {
        filtered = filtered.filter(report => report.status === statusFilter);
      }


      return filtered;
    })() : filteredReports;

    return (
      <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-green-500 rounded-xl">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {reportsTitle}
            </h3>
            <p className="text-gray-600">
              {reportsDescription}
            </p>
          </div>
        </div>

      {/* Search and Filter Controls */}
      {reportsToShow.length > 0 && (
        <div className="mb-6 sm:mb-8 bg-gray-50/50 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 w-full">
              {/* Search Bar */}
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              
              {/* Filter Controls */}
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Filter className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 sm:pl-12 pr-8 py-2.5 sm:py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm hover:shadow-md appearance-none min-w-[140px] sm:min-w-[160px]"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="declined">Declined</option>
                    <option value="verifying">Verifying</option>
                    <option value="awaiting_verification">Awaiting Verification</option>
                  </select>
                </div>
              </div>
              
              {/* Clear Filters Button */}
              {(searchQuery || statusFilter) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white/80 hover:bg-white border border-gray-200 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <XIcon className="h-4 w-4" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          
          {/* Results Count */}
          <div className="mt-3 sm:mt-4 text-sm text-gray-600 font-medium">
            Showing {patrolFilteredReports.length} of {reportsToShow.length} reports
          </div>
        </div>
      )}

      {/* Reports Grid */}
      {loadingMyReports ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4 animate-pulse">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Reports</h3>
          <p className="text-gray-600">Fetching your reports...</p>
        </div>
      ) : reportsToShow.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isPatrolUser ? 'No Resolved Reports Yet' : 'No Reports Yet'}
          </h3>
          <p className="text-gray-600">
            {isPatrolUser 
              ? 'Complete your first patrol assignment to see it here.' 
              : 'Start by submitting your first report to help improve the community.'
            }
          </p>
        </div>
      ) : patrolFilteredReports.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matching Reports</h3>
          <p className="text-gray-600 mb-4">No reports match your search criteria.</p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-200"
          >
            <XIcon className="h-4 w-4" />
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {patrolFilteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group overflow-hidden"
              onClick={() => navigate(`/reports/${report.id}`)}
            >
              {report.images && report.images.length > 0 ? (
                <div className="relative h-48 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <img 
                    src={report.images[0]} 
                    alt={report.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-zoom-in"
                    loading="lazy"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightbox(report.images, 0, report.title);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {report.images.length > 1 && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-gray-700">
                      +{report.images.length - 1} more
                    </div>
                  )}
                  {isPatrolUser && (
                    <div className="absolute top-3 left-3 bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-lg">
                      ✓ Resolved
                    </div>
                  )}
                </div>
              ) : (
                <div className={`h-48 flex items-center justify-center transition-all duration-200 ${
                  isPatrolUser 
                    ? 'bg-gradient-to-br from-emerald-50 via-green-100 to-emerald-200 group-hover:from-emerald-100 group-hover:to-emerald-200'
                    : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 group-hover:from-gray-100 group-hover:to-gray-200'
                }`}>
                  <div className="text-center">
                    {isPatrolUser ? (
                      <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                    ) : (
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    )}
                    <p className={`text-sm font-medium ${
                      isPatrolUser ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      {isPatrolUser ? 'Resolved Report' : 'No Image'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="p-6">
                <h4 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2 group-hover:text-gray-700 transition-colors duration-200 mb-2">
                  {report.title}
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
                  {report.description}
                </p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${
                      isPatrolUser ? 'bg-emerald-100 text-emerald-800' : getStatusColor(report.status)
                    }`}>
                      {isPatrolUser ? '✓ Resolved' : ((report.status === 'declined' || report.status === 'rejected') ? 'Declined' : report.status.replace('_', ' '))}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                    <Calendar className="h-3 w-3" />
                    {new Date(report.updated_at || report.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  {isOwnProfile ? (
                    <button
                      className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium transition-colors duration-200"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(report); }}
                    >
                      <X className="h-4 w-4" />
                      Delete
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium transition-colors duration-200 group/view"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/reports/${report.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    );
  };

  const renderNotifications = () => {
    // Use the new NotificationPreferences component for better UX
    if (isOwnProfile) {
      return (
        <div className="p-4 sm:p-6 lg:p-8">
          <NotificationPreferences />
        </div>
      );
    }
    
    // Fallback for viewing other users' profiles
    return (
      <div className="p-4 sm:p-8">
        <div className="text-center py-8 text-gray-500">
          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Notification settings are only available for your own profile.</p>
        </div>
      </div>
    );
  };

  const renderAccount = () => (
    <div className="p-4 sm:p-8">
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <div className="p-3 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl shadow-lg">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Account Settings</h3>
          <p className="text-sm sm:text-base text-gray-600">Manage your account information and security</p>
        </div>
      </div>

      {/* Visual Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6 sm:mb-8"></div>

      <div className="space-y-6">
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-200">
          <label className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-3">
            <Mail className="w-4 h-4" />
            Email Address
          </label>
          <EditableEmail initialValue={user?.email || ''} />
        </div>
        <div className="bg-green-50 rounded-2xl p-6 border border-green-100 shadow-sm hover:shadow-md transition-shadow duration-200">
          <label className="flex items-center gap-2 text-sm font-semibold text-green-800 mb-3">
            <Smartphone className="h-4 w-4 text-green-600" />
            Phone Number
          </label>
          <PhoneEditor initialValue={user?.phone || ''} />
          <p className="flex items-center gap-1.5 text-green-700 text-xs mt-2">
            <Info className="w-3 h-3" />
            <span>Format: +63 9XXXXXXXXX (Philippine mobile numbers only)</span>
          </p>
        </div>
        
        {isAdminLike(user?.role) && (
          <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-semibold text-purple-800 mb-3">
              <Shield className="h-4 w-4 text-purple-600" />
              Account Type
            </label>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-purple-200 rounded-lg">
                <p className="text-purple-900 font-semibold capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAchievements = () => (
    <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-yellow-500 rounded-xl">
          <Award className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Achievements</h3>
          <p className="text-gray-600">Track your progress and unlock rewards</p>
        </div>
      </div>
      
      <AchievementsPanel userId={user?.id || ''} />
    </div>
  );

  const renderStatistics = () => {
    // Use AnalyticsDashboard for own profile, show basic stats for others
    if (isOwnProfile) {
      return (
        <div className="p-4 sm:p-6 lg:p-8">
          <AnalyticsDashboard userId={user?.id} timeRange="month" />
        </div>
      );
    }
    
    // Fallback view for other users' profiles
    return (
      <div className="p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                {user?.role === 'patrol' ? 'Patrol Statistics' : 'Activity Statistics'}
              </h3>
              <div className="relative">
              <button
                onClick={() => setShowTooltip(showTooltip === 'statistics-info' ? null : 'statistics-info')}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Statistics information"
              >
                <HelpCircle className="w-5 h-5 text-indigo-600" />
              </button>
              <AnimatePresence>
                {showTooltip === 'statistics-info' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute left-0 top-full mt-2 w-72 p-4 bg-gray-900 text-white text-sm rounded-lg shadow-xl z-10"
                    role="tooltip"
                  >
                    <p className="font-semibold mb-2">Understanding Your Statistics</p>
                    <p className="text-gray-300 mb-2">
                      {user?.role === 'patrol' 
                        ? 'Track your patrol performance with detailed metrics including level, experience points, and completed reports.' 
                        : 'Monitor your community contributions including reports submitted, verified, and resolved.'}
                    </p>
                    <p className="text-gray-400 text-xs">Click anywhere to close</p>
                    <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {user?.role === 'patrol' ? 'Track your patrol performance' : 'Monitor your contribution to the community'}
            </p>
          </div>
        </div>

        {/* Visual Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6 sm:mb-8"></div>

        <div className="grid grid-cols-2 gap-6">
        {user?.role === 'patrol' ? (
          // Patrol-specific stats
          <>
            <div className="bg-blue-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200 border border-blue-100 relative">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-200 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-blue-900 mb-2">{userStats.patrol_level}</p>
              <p className="text-blue-700 font-semibold">Patrol Level</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                <Star className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-purple-900 mb-2">{userStats.patrol_experience_points}</p>
              <p className="text-purple-700 font-semibold">Experience Points</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-green-900 mb-2">{userStats.patrol_reports_accepted}</p>
              <p className="text-green-700 font-semibold">Reports Accepted</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                <Award className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-emerald-900 mb-2">{userStats.patrol_reports_completed}</p>
              <p className="text-emerald-700 font-semibold">Reports Completed</p>
            </div>
          </>
        ) : (
          // Regular user stats
          <>
            <div className="bg-blue-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                <Star className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-blue-900 mb-2">{user?.points || 0}</p>
              <p className="text-blue-700 font-semibold">Total Points</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-purple-900 mb-2">{userStats.reports_submitted}</p>
              <p className="text-purple-700 font-semibold">Reports Submitted</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-green-900 mb-2">{userStats.reports_verified}</p>
              <p className="text-green-700 font-semibold">Reports Verified</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-6 text-center group hover:shadow-lg transition-all duration-200">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 group-hover:scale-105 transition-transform duration-200">
                <Award className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-emerald-900 mb-2">{userStats.reports_resolved}</p>
              <p className="text-emerald-700 font-semibold">Reports Resolved</p>
            </div>
          </>
        )}
        </div>
      </div>
    );
  };

  // Render content based on active tab
  let content;
  switch (activeTab) {
    case 'overview':
      content = renderOverview();
      break;
    case 'reports':
      content = renderReports();
      break;
    case 'achievements':
      content = renderAchievements();
      break;
    case 'statistics':
      content = renderStatistics();
      break;
    default:
      content = renderOverview();
  }

  return (
    <>
      {content}
      
      {/* Lightbox for fullscreen image view */}
      {isImageViewerOpen && lightboxImages.length > 0 && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[99999] bg-black flex items-center justify-center p-4"
          onClick={() => setIsImageViewerOpen(false)}
          style={{ margin: 0, padding: '1rem' }}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setIsImageViewerOpen(false);
            }}
            aria-label="Close fullscreen"
          >
            <X className="w-10 h-10" />
          </button>

          {/* Image Counter */}
          {lightboxImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black bg-opacity-70 text-white text-sm px-4 py-2 rounded-full font-medium">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}

          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`${lightboxReportTitle} - Image ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain cursor-default"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navigation Buttons */}
            {lightboxImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-3 shadow-xl transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-3 shadow-xl transition-all"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
