import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChatService } from '../services/chatService';
import { X, Search, MessageCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: any) => void;
}

export function NewConversationModal({ isOpen, onClose, onConversationCreated }: NewConversationModalProps) {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [creatingConversation, setCreatingConversation] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, avatar_url, role')
        .neq('id', currentUser?.id) // Exclude current user
        .not('role', 'in', '(admin,patrol)') // Exclude admin and patrol roles
        .eq('is_banned', false) // Only show active users
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async (userId: string) => {
    if (!currentUser?.id) return;
    
    setCreatingConversation(userId);
    try {
      // Use the existing getOrCreateConversation method
      const conversation = await ChatService.getOrCreateConversation(currentUser.id, userId);
      onConversationCreated(conversation);
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Failed to create conversation. Please try again.');
    } finally {
      setCreatingConversation(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Conversation</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* User List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              {searchTerm ? 'No users found matching your search.' : 'No users available to chat with.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
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
                      <div>
                        <div className="font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartConversation(user.id)}
                      disabled={creatingConversation === user.id}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creatingConversation === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )}
                      <span>{creatingConversation === user.id ? 'Creating...' : 'Chat'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
