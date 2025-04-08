import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
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
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim()) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `%${searchTerm}%`)
          .neq('id', currentUser?.id) // Exclude current user
          .limit(10);

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, currentUser?.id]);

  return (
    <div className="p-4 border-b">
      <h2 className="text-xl font-semibold mb-4">Find Users</h2>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users..."
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {users.length > 0 && (
        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
          {users.map((user) => (
            <div 
              key={user.id} 
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
              onClick={() => onStartConversation(user.id, user.username)}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-3">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 text-sm">{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="font-medium">{user.username}</span>
              </div>
              <button 
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartConversation(user.id, user.username);
                }}
              >
                Message
              </button>
            </div>
          ))}
        </div>
      )}
      
      {searchTerm && !isLoading && users.length === 0 && (
        <div className="mt-4 text-center text-gray-500">
          No users found
        </div>
      )}
    </div>
  );
}; 