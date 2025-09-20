import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AdminDutySchedule() {
  const [patrolUsers, setPatrolUsers] = useState<Array<{id: string, username: string, full_name: string | null}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatrolUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .eq('role', 'patrol')
        .order('username');
      
      if (error) throw error;
      setPatrolUsers(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load patrol users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadPatrolUsers();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Patrol Officers</h3>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg">
          {patrolUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No patrol users found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {patrolUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.username}
                      </div>
                      {user.full_name && (
                        <div className="text-sm text-gray-500">
                          {user.full_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


