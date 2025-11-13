import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { authenticatedRequest } from '../lib/jwt';
import { getApiUrl } from '../lib/config';
import { Loader2, UserPlus, UserMinus, Shield, Ban, RefreshCw, ShieldCheck, User, ChevronDown, Check, X } from 'lucide-react';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Notification } from './Notification';
import { useAuthStore } from '../store/authStore';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'patrol' | 'superadmin';
  is_banned: boolean;
  verification_status?: string | null;
  created_at: string;
  last_sign_in: string;
  avatar_url: string | null;
}

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  type: 'danger' | 'warning' | 'info';
}

export function UserManagement() {
  const { user: currentUser, isAdminLike } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'patrol' | 'superadmin'>('all');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Filter users based on current user role
      const allProfiles = (data || []);
      let filteredUsers = allProfiles;
      
      // If current user is admin, hide superadmin users
      if (currentUser?.role === 'admin') {
        filteredUsers = allProfiles.filter((user: any) => user.role !== 'superadmin');
      } 
      // If current user is not admin-like, hide both admin and superadmin users
      else if (!isAdminLike(currentUser?.role)) {
        filteredUsers = allProfiles.filter((user: any) => user.role !== 'admin' && user.role !== 'superadmin');
      }
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setNotification({
        message: 'Failed to fetch users. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin' | 'patrol' | 'superadmin') => {
    setActionLoading(userId);
    try {
      const response = await authenticatedRequest(
        getApiUrl(`/api/admin/users/${userId}/role`),
        {
          method: 'PUT',
          body: JSON.stringify({ role: newRole })
        }
      );
      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json') ? await response.json() : null;
      if (!response.ok || !result?.success) {
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(text || `HTTP ${response.status}`);
        }
        throw new Error(result?.error || 'Failed to update role');
      }
      await fetchUsers();
      setNotification({
        message: `User role updated to ${newRole} successfully.`,
        type: 'success',
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      setNotification({
        message: error instanceof Error ? error.message : 'Failed to update user role.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserBan = async (userId: string, isBanned: boolean) => {
    setActionLoading(userId);
    try {
      const response = await authenticatedRequest(
        getApiUrl(`/api/admin/users/${userId}/ban`),
        {
          method: 'PUT',
          body: JSON.stringify({ is_banned: isBanned })
        }
      );
      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json') ? await response.json() : null;
      if (!response.ok || !result?.success) {
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(text || `HTTP ${response.status}`);
        }
        throw new Error(result?.error || 'Failed to update user status');
      }
      // If the admin bans themselves accidentally, sign them out
      const { user: sessionUser } = useAuthStore.getState();
      if (sessionUser && sessionUser.id === userId && isBanned) {
        await supabase.auth.signOut();
      }
      await fetchUsers();
      setNotification({
        message: `User ${isBanned ? 'banned' : 'unbanned'} successfully.`,
        type: 'success',
      });
    } catch (error) {
      console.error('Error toggling user ban:', error);
      setNotification({
        message: error instanceof Error ? error.message : 'Failed to update user status.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = (userId: string, newRole: 'user' | 'admin' | 'patrol' | 'superadmin') => {
    setConfirmation({
      isOpen: true,
      title: `Change User Role to ${newRole}`,
      message: `Are you sure you want to change this user's role to ${newRole}?`,
      onConfirm: () => updateUserRole(userId, newRole),
      type: 'warning',
    });
  };

  const handleBanToggle = (userId: string, isBanned: boolean) => {
    setConfirmation({
      isOpen: true,
      title: isBanned ? 'Ban User' : 'Unban User',
      message: isBanned
        ? 'Are you sure you want to ban this user? They will not be able to access the application.'
        : 'Are you sure you want to unban this user? They will regain access to the application.',
      onConfirm: () => toggleUserBan(userId, isBanned),
      type: 'danger',
    });
  };

  const filteredUsers = users.filter(user => {
    // role filter
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;

    if (searchTerm === '') return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  // counts used in dropdown badges
  const userCount = users.filter(u => u.role === 'user').length;

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const superadminCount = users.filter(u => u.role === 'superadmin').length;
  const patrolCount = users.filter(u => u.role === 'patrol').length;
  const bannedCount = users.filter(u => u.is_banned).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRoleDropdownOpen(false);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6">
      {/* Header + Controls */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">User Management</h2>
            <p className="text-sm text-slate-500 mt-1">Manage users, roles and account status</p>
          </div>

          <div className="flex-1 sm:flex-none flex items-center gap-3 justify-end">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</div>
            </div>

            {/* Custom Role Filter Dropdown */}
            <div className="relative ml-2" ref={dropdownRef}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen((s) => !s)}
                  aria-haspopup="menu"
                  aria-expanded={roleDropdownOpen}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-slate-200 shadow-sm text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                    <span className="text-sm">
                    {roleFilter === 'all' ? 'All roles' : roleFilter === 'admin' ? 'Admins' : roleFilter === 'superadmin' ? 'Super Admins' : roleFilter === 'patrol' ? 'Patrols' : 'Users'}
                  </span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600">
                    {roleFilter === 'all' ? totalUsers : roleFilter === 'admin' ? adminCount : roleFilter === 'superadmin' ? superadminCount : roleFilter === 'patrol' ? patrolCount : userCount}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {roleFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:bg-slate-50 focus:outline-none"
                    aria-label="Clear role filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown menu */}
              <div
                className={`origin-top-right absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg ring-1 ring-black/5 z-50 transition-all duration-150 ease-out transform ${roleDropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                role="menu"
                aria-hidden={!roleDropdownOpen}
              >
                <div className="py-1">
                  <button
                    onClick={() => { setRoleFilter('all'); setRoleDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 text-sm ${roleFilter === 'all' ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    role="menuitem"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">👥</span>
                      <span>All roles</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs text-slate-500">{totalUsers}</span>
                      {roleFilter === 'all' && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                  </button>

                  <button
                    onClick={() => { setRoleFilter('user'); setRoleDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 text-sm ${roleFilter === 'user' ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    role="menuitem"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">👤</span>
                      <span>Users</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs text-slate-500">{userCount}</span>
                      {roleFilter === 'user' && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                  </button>

                  <button
                    onClick={() => { setRoleFilter('admin'); setRoleDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 text-sm ${roleFilter === 'admin' ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    role="menuitem"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🛡️</span>
                      <span>Admins</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs text-slate-500">{adminCount}</span>
                      {roleFilter === 'admin' && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                  </button>

                  {currentUser?.role === 'superadmin' && (
                    <button
                      onClick={() => { setRoleFilter('superadmin'); setRoleDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 text-sm ${roleFilter === 'superadmin' ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'}`}
                      role="menuitem"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">👑</span>
                        <span>Super Admins</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs text-slate-500">{superadminCount}</span>
                        {roleFilter === 'superadmin' && <Check className="w-4 h-4 text-sky-600" />}
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => { setRoleFilter('patrol'); setRoleDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 text-sm ${roleFilter === 'patrol' ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    role="menuitem"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🚔</span>
                      <span>Patrols</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs text-slate-500">{patrolCount}</span>
                      {roleFilter === 'patrol' && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="text-sm text-slate-500">Total Users</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">{totalUsers}</div>
          </div>
          {currentUser?.role === 'superadmin' && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-sm text-slate-500">Admins</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">{adminCount}</div>
            </div>
          )}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="text-sm text-slate-500">Patrols</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">{patrolCount}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="text-sm text-slate-500">Banned</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">{bannedCount}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
          <div className="text-sm text-gray-500">Loading users...</div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-12 text-center">
          <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <div className="text-gray-500 font-medium">No users found</div>
          <div className="text-sm text-gray-400 mt-1">
            {searchTerm 
              ? `No users match "${searchTerm}". Try adjusting your search terms.`
              : 'No users available. Users will appear here once they register.'
            }
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <li key={user.id} className="px-3 py-3 sm:px-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center">
                        <span className="text-slate-600 font-medium">{user.username.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <div className="text-sm font-semibold text-slate-900 truncate">{user.username}</div>
                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {isAdminLike(currentUser?.role) && (
                          <div className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'patrol' ? 'bg-sky-100 text-sky-700' : user.role === 'superadmin' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {user.role}
                          </div>
                        )}
                        <div className={`px-2 py-0.5 text-xs font-medium rounded-full ${user.is_banned ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {user.is_banned ? 'Banned' : 'Active'}
                        </div>
                      </div>
                    </div>

                    {isAdminLike(currentUser?.role) && (
                      <div className="mt-3 flex items-center gap-2">
                        {/* Only allow superadmins to manage admin role */}
                        {currentUser?.role === 'superadmin' && (
                          user.role !== 'admin' ? (
                            <button
                              onClick={() => handleRoleChange(user.id, 'admin')}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />} 
                              Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(user.id, 'user')}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                              Remove
                            </button>
                          )
                        )}

                        {/* Patrol and User role management for admins and superadmins */}
                        {user.role !== 'patrol' ? (
                          <button
                            onClick={() => handleRoleChange(user.id, 'patrol')}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />} 
                            Patrol
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(user.id, 'user')}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />} 
                            User
                          </button>
                        )}

                        {/* Superadmin management (only visible to superadmins) */}
                        {currentUser?.role === 'superadmin' && (
                          user.role !== 'superadmin' ? (
                            <button
                              onClick={() => handleRoleChange(user.id, 'superadmin')}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />} 
                              Make Superadmin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(user.id, 'admin')}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                              Demote
                            </button>
                          )
                        )}

                        {/* Ban toggle */}
                        {!user.is_banned ? (
                          <button
                            onClick={() => handleBanToggle(user.id, true)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />} 
                            Ban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBanToggle(user.id, false)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />} 
                            Unban
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
        type={confirmation.type}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
} 