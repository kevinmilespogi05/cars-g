import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, UserPlus, UserMinus, Shield, Ban, RefreshCw, ShieldCheck } from 'lucide-react';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Notification } from './Notification';
import { useAuthStore } from '../store/authStore';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'patrol';
  is_banned: boolean;
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
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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
      // Filter out admin users if current user is not an admin
      const filteredUsers = currentUser?.role === 'admin' 
        ? data 
        : data?.filter(user => user.role !== 'admin') || [];
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

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin' | 'patrol') => {
    setActionLoading(userId);
    try {
      // First, ensure the current session has admin rights to update another user's role
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (!sessionUser) throw new Error('Not authenticated');

      // Attempt role update (RLS requires admin policy to allow updating role)
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select('role')
        .single();

      if (error) throw error;
      await fetchUsers();
      setNotification({
        message: `User role updated to ${newRole} successfully.`,
        type: 'success',
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      setNotification({
        message: 'Failed to update user role. Ensure your admin policies allow updating the role column.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserBan = async (userId: string, isBanned: boolean) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: isBanned })
        .eq('id', userId);

      if (error) throw error;
      // If the admin bans themselves accidentally, sign them out
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
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
        message: 'Failed to update user status. Please try again.',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = (userId: string, newRole: 'user' | 'admin' | 'patrol') => {
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
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6">
      {/* Mobile Header */}
      <div className="sm:hidden mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-3">User Management</h2>
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              className="block w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <div className="flex space-x-4">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              className="pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <li key={user.id} className="px-3 py-4 sm:px-6">
                {/* Mobile Layout */}
                <div className="sm:hidden">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-medium text-lg">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-base font-medium text-gray-900 truncate">{user.username}</h3>
                        {currentUser?.role === 'admin' && (
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'patrol' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        )}
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.is_banned ? 'Banned' : 'Active'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      {currentUser?.role === 'admin' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {user.role === 'user' ? (
                            <button
                              onClick={() => handleRoleChange(user.id, 'admin')}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Shield className="h-3 w-3 mr-1" />
                              )}
                              Make Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(user.id, 'user')}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <UserMinus className="h-3 w-3 mr-1" />
                              )}
                              Remove Admin
                            </button>
                          )}
                          <button
                            onClick={() => handleRoleChange(user.id, 'patrol' as any)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-3 w-3 mr-1" />
                            )}
                            Make Patrol
                          </button>
                          {!user.is_banned ? (
                            <button
                              onClick={() => handleBanToggle(user.id, true)}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Ban className="h-3 w-3 mr-1" />
                              )}
                              Ban User
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBanToggle(user.id, false)}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <UserPlus className="h-3 w-3 mr-1" />
                              )}
                              Unban User
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {currentUser?.role === 'admin' && (
                      <div className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'patrol' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </div>
                    )}
                    <div className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.is_banned ? 'Banned' : 'Active'}
                    </div>
                    {currentUser?.role === 'admin' && (
                      <div className="flex space-x-2">
                        {user.role === 'user' ? (
                          <button
                            onClick={() => handleRoleChange(user.id, 'admin')}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Shield className="h-3 w-3 mr-1" />
                            )}
                            Make Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(user.id, 'user')}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <UserMinus className="h-3 w-3 mr-1" />
                            )}
                            Remove Admin
                          </button>
                        )}
                        <button
                          onClick={() => handleRoleChange(user.id, 'patrol' as any)}
                          disabled={actionLoading === user.id}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3 w-3 mr-1" />
                          )}
                          Make Patrol
                        </button>
                        {!user.is_banned ? (
                          <button
                            onClick={() => handleBanToggle(user.id, true)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Ban className="h-3 w-3 mr-1" />
                            )}
                            Ban User
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBanToggle(user.id, false)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <UserPlus className="h-3 w-3 mr-1" />
                            )}
                            Unban User
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