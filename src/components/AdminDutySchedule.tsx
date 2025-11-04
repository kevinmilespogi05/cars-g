import React, { useEffect, useState } from 'react';
import { Users, Info, Clock, UserCheck } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Duty Schedule Management</h3>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How to manage duty schedules:</p>
            <ol className="list-decimal pl-5 space-y-1 text-xs">
              <li>View all patrol officers available for duty assignments below.</li>
              <li>Assign officers to AM (morning) or PM (afternoon/evening) shifts.</li>
              <li>Designate dispatcher (assigns reports) and receiver (handles completed reports) per shift.</li>
              <li>Ensure all shifts have proper coverage throughout the day.</li>
            </ol>
            <p className="text-xs mt-2 text-blue-700">
              <strong>Note:</strong> Duty schedules help organize patrol coverage and ensure proper report handling.
            </p>
          </div>
        </div>
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
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <div className="text-gray-500 font-medium">No patrol officers found</div>
              <div className="text-sm text-gray-400 mt-1">
                No patrol officers are registered yet. Patrol officers need to be assigned the "patrol" role in User Management.
              </div>
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


