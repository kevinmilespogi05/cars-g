import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface UserSearchProps {
  onStartConversation: (userId: string, username: string) => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onStartConversation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();

  const searchUsers = useCallback(async (term: string) => {
    if (!term.trim()) {
      setUsers([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${term}%`)
        .neq('id', currentUser?.id)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users. Please try again.');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => searchUsers(searchTerm), 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, searchUsers]);

  const handleUserClick = useCallback((user: User) => {
    onStartConversation(user.id, user.username);
  }, [onStartConversation]);

  return (
    <div className="p-4 border-b">
      <h2 className="text-xl font-semibold mb-4">Find Users</h2>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users..."
          aria-label="Search users"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5" aria-label="Loading">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-2 text-red-500 text-sm" role="alert">
          {error}
        </div>
      )}
      
      {users.length > 0 && (
        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto" role="list">
          {users.map((user) => (
            <div 
              key={user.id} 
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
              onClick={() => handleUserClick(user)}
              role="listitem"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleUserClick(user);
                }
              }}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-3">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={`${user.username}'s avatar`} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="font-medium">{user.username}</span>
              </div>
              <button 
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUserClick(user);
                }}
                aria-label={`Message ${user.username}`}
              >
                Message
              </button>
            </div>
          ))}
        </div>
      )}
      
      {searchTerm && !isLoading && !error && users.length === 0 && (
        <div className="mt-4 text-center text-gray-500">
          No users found
        </div>
      )}
    </div>
  );
}; 