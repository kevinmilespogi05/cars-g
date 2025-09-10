import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import type { DutySchedule } from '../types';
import { caseService } from '../services/caseService';

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

  const end = useMemo(() => formatDate(addDays(new Date(start), Math.max(0, days - 1))), [start, days]);

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

  useEffect(() => { load(); }, [start, end]);

  const upsert = async (duty_date: string, shift: 'AM' | 'PM', field: 'dispatcher_user_id' | 'receiver_user_id' | 'notes', value: string) => {
    try {
      const existing = items.find(i => i.duty_date === duty_date && i.shift === shift);
      const payload: any = { duty_date, shift };
      if (field === 'dispatcher_user_id') payload.dispatcher_user_id = value || null;
      if (field === 'receiver_user_id') payload.receiver_user_id = value || null;
      if (field === 'notes') payload.notes = value || null;
      const saved = await caseService.upsertDutySchedule({ ...existing, ...payload } as any);
      setItems(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(i => i.id === saved.id || (i.duty_date === duty_date && i.shift === shift));
        if (idx >= 0) copy[idx] = saved; else copy.push(saved);
        return copy;
      });
    } catch (e: any) {
      alert(e?.message || 'Failed to save duty schedule');
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

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">AM Dispatcher</th>
              <th className="text-left px-3 py-2">AM Receiver</th>
              <th className="text-left px-3 py-2">PM Dispatcher</th>
              <th className="text-left px-3 py-2">PM Receiver</th>
              <th className="text-left px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.date} className="border-b">
                <td className="px-3 py-2 whitespace-nowrap"><div className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-gray-500" />{r.date}</div></td>
                <td className="px-3 py-2">
                  <input
                    className="w-44 px-2 py-1 border border-gray-300 rounded"
                    placeholder="User ID / Name"
                    value={r.am?.dispatcher_user_id || ''}
                    onChange={(e) => upsert(r.date, 'AM', 'dispatcher_user_id', e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-44 px-2 py-1 border border-gray-300 rounded"
                    placeholder="User ID / Name"
                    value={r.am?.receiver_user_id || ''}
                    onChange={(e) => upsert(r.date, 'AM', 'receiver_user_id', e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-44 px-2 py-1 border border-gray-300 rounded"
                    placeholder="User ID / Name"
                    value={r.pm?.dispatcher_user_id || ''}
                    onChange={(e) => upsert(r.date, 'PM', 'dispatcher_user_id', e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-44 px-2 py-1 border border-gray-300 rounded"
                    placeholder="User ID / Name"
                    value={r.pm?.receiver_user_id || ''}
                    onChange={(e) => upsert(r.date, 'PM', 'receiver_user_id', e.target.value)}
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


