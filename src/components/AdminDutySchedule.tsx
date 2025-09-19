import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import type { DutySchedule } from '../types';
import { caseService } from '../services/caseService';
import { supabase } from '../lib/supabase';

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function AdminDutySchedule() {
  const [start, setStart] = useState<string>(() => formatDate(new Date()));
  const [days, setDays] = useState<number>(7);
  const [items, setItems] = useState<DutySchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{id: string, username: string, full_name: string | null}>>([]);

  const end = useMemo(() => formatDate(addDays(new Date(start), Math.max(0, days - 1))), [start, days]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .eq('role', 'patrol')
        .order('username');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (e: any) {
      console.error('Failed to load users:', e);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await caseService.listDutySchedules(start, end);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load duty schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
    loadUsers();
  }, [start, end]);

  // Function to find user ID by username
  const findUserIdByUsername = (username: string): string | null => {
    const user = users.find(u => u.username === username);
    return user ? user.id : null;
  };

  // Function to find username by user ID
  const findUsernameById = (userId: string | null): string => {
    if (!userId) return '';
    const user = users.find(u => u.id === userId);
    return user ? user.username : '';
  };

  const upsert = async (duty_date: string, shift: 'AM' | 'PM', field: 'dispatcher_user_id' | 'receiver_user_id' | 'notes' | 'group', value: string) => {
    try {
      // Clear previous validation errors
      setValidationError(null);
      
      // Convert username to user ID for database storage
      let userId = value;
      if (field === 'dispatcher_user_id' || field === 'receiver_user_id') {
        if (value) {
          userId = findUserIdByUsername(value);
          if (!userId) {
            setValidationError('User not found. Please select a valid user from the dropdown.');
            return;
          }
        } else {
          userId = null;
        }
      }

      const existing = items.find(i => i.duty_date === duty_date && i.shift === shift);
      const payload: any = { duty_date, shift };
      if (field === 'dispatcher_user_id') payload.dispatcher_user_id = userId;
      if (field === 'receiver_user_id') payload.receiver_user_id = userId;
      if (field === 'group') payload.group = value || null;
      if (field === 'notes') payload.notes = value || null;
      const saved = await caseService.upsertDutySchedule({ ...existing, ...payload } as any);
      setItems(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(i => i.id === saved.id || (i.duty_date === duty_date && i.shift === shift));
        if (idx >= 0) copy[idx] = saved; else copy.push(saved);
        return copy;
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to save duty schedule');
    }
  };

  const rows = useMemo(() => {
    const out: Array<{ date: string; am: DutySchedule | undefined; pm: DutySchedule | undefined }> = [];
    const s = new Date(start);
    for (let i = 0; i < days; i++) {
      const date = formatDate(addDays(s, i));
      out.push({
        date,
        am: items.find(it => it.duty_date === date && it.shift === 'AM'),
        pm: items.find(it => it.duty_date === date && it.shift === 'PM'),
      });
    }
    return out;
  }, [items, start, days]);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Start Date</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="px-2 py-1 border border-gray-300 rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Days</label>
          <input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 7)))} className="w-24 px-2 py-1 border border-gray-300 rounded" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}
      {validationError && <div className="p-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded">{validationError}</div>}

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">AM Dispatcher</th>
              <th className="text-left px-3 py-2">AM Receiver</th>
              <th className="text-left px-3 py-2">PM Dispatcher</th>
              <th className="text-left px-3 py-2">PM Receiver</th>
              <th className="text-left px-3 py-2">Group</th>
              <th className="text-left px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.date} className="border-b">
                <td className="px-3 py-2 whitespace-nowrap"><div className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-gray-500" />{r.date}</div></td>
                <td className="px-3 py-2">
                  <select
                    className="w-44 px-2 py-1 border border-gray-300 rounded"
                    value={findUsernameById(r.am?.dispatcher_user_id || null)}
                    onChange={(e) => upsert(r.date, 'AM', 'dispatcher_user_id', e.target.value)}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.username}>
                        {user.username} {user.full_name ? `(${user.full_name})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    className="w-44 px-2 py-1 border border-gray-300 rounded"
                    value={findUsernameById(r.am?.receiver_user_id || null)}
                    onChange={(e) => upsert(r.date, 'AM', 'receiver_user_id', e.target.value)}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.username}>
                        {user.username} {user.full_name ? `(${user.full_name})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    className="w-44 px-2 py-1 border border-gray-300 rounded"
                    value={findUsernameById(r.pm?.dispatcher_user_id || null)}
                    onChange={(e) => upsert(r.date, 'PM', 'dispatcher_user_id', e.target.value)}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.username}>
                        {user.username} {user.full_name ? `(${user.full_name})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    className="w-44 px-2 py-1 border border-gray-300 rounded"
                    value={findUsernameById(r.pm?.receiver_user_id || null)}
                    onChange={(e) => upsert(r.date, 'PM', 'receiver_user_id', e.target.value)}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.username}>
                        {user.username} {user.full_name ? `(${user.full_name})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-40 px-2 py-1 border border-gray-300 rounded"
                    placeholder="e.g., Alpha"
                    value={r.am?.group || r.pm?.group || ''}
                    onChange={(e) => upsert(r.date, 'AM', 'group', e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-64 px-2 py-1 border border-gray-300 rounded"
                    placeholder="Notes"
                    value={r.am?.notes || r.pm?.notes || ''}
                    onChange={(e) => upsert(r.date, 'AM', 'notes', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


