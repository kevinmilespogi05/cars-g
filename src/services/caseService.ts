import { supabase } from '../lib/supabase';
import type { DutySchedule, ReportRating } from '../types';

export const caseService = {
  async generateMonthly(year: number, month: number): Promise<number> {
    const { data, error } = await supabase.rpc('generate_monthly_cases', { p_year: year, p_month: month });
    if (error) throw error;
    return data as number;
  },

  async generateYearly(year: number): Promise<number> {
    const { data, error } = await supabase.rpc('generate_yearly_cases', { p_year: year });
    if (error) throw error;
    return data as number;
  },

  async getMonthlyCases(year: number, month: number) {
    const from = new Date(year, month - 1, 1).toISOString();
    const to = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        likes:likes(count),
        comments:comments(count),
        comment_count:report_comments(count),
        rating_avg:report_ratings(stars),
        rating_count:report_ratings(count)
      `)
      .gte('created_at', from)
      .lte('created_at', to)
      .eq('status', 'resolved')
      .order('created_at', { ascending: true });
    if (error) throw error;

    const rows = data || [];
    // fetch reporter profiles
    const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      profiles = profs || [];
    }
    const pmap = new Map(profiles.map(p => [p.id, p]));
    // compute rating avg and attach profile
    return rows.map((r: any) => {
      const stars = Array.isArray(r.rating_avg) ? r.rating_avg.map((x:any)=>x.stars) : [];
      const avg = stars.length ? Math.round((stars.reduce((a:number,b:number)=>a+b,0)/stars.length)*10)/10 : undefined;
      return {
        ...r,
        user_profile: pmap.get(r.user_id) || null,
        rating_avg: avg,
        rating_count: r.rating_count?.[0]?.count || 0,
      };
    });
  },

  async getYearlyCases(year: number) {
    const from = new Date(year, 0, 1).toISOString();
    const to = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        likes:likes(count),
        comments:comments(count),
        comment_count:report_comments(count),
        rating_avg:report_ratings(stars),
        rating_count:report_ratings(count)
      `)
      .gte('created_at', from)
      .lte('created_at', to)
      .eq('status', 'resolved')
      .order('created_at', { ascending: true });
    if (error) throw error;

    const rows = data || [];
    const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      profiles = profs || [];
    }
    const pmap = new Map(profiles.map(p => [p.id, p]));
    return rows.map((r: any) => {
      const stars = Array.isArray(r.rating_avg) ? r.rating_avg.map((x:any)=>x.stars) : [];
      const avg = stars.length ? Math.round((stars.reduce((a:number,b:number)=>a+b,0)/stars.length)*10)/10 : undefined;
      return {
        ...r,
        user_profile: pmap.get(r.user_id) || null,
        rating_avg: avg,
        rating_count: r.rating_count?.[0]?.count || 0,
      };
    });
  },

  async upsertDutySchedule(input: Partial<DutySchedule> & { duty_date: string; shift: 'AM' | 'PM' }): Promise<DutySchedule> {
    const payload: any = {
      duty_date: input.duty_date,
      shift: input.shift,
      dispatcher_user_id: input.dispatcher_user_id ?? null,
      receiver_user_id: input.receiver_user_id ?? null,
      group: (input as any).group ?? null,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('duty_schedules')
      .upsert([payload], { onConflict: 'duty_date,shift' })
      .select('*')
      .single();
    if (error) throw error;
    return data as DutySchedule;
  },

  async listDutySchedules(fromDate?: string, toDate?: string): Promise<DutySchedule[]> {
    let query = supabase.from('duty_schedules').select('*').order('duty_date', { ascending: true });
    if (fromDate) query = query.gte('duty_date', fromDate);
    if (toDate) query = query.lte('duty_date', toDate);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as DutySchedule[];
  },

  async rateReport(reportId: string, stars: 1 | 2 | 3 | 4 | 5, comment?: string | null): Promise<ReportRating> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not authenticated');
    const payload = {
      report_id: reportId,
      requester_user_id: userId,
      stars,
      comment: comment ?? null,
    };
    const { data, error } = await supabase
      .from('report_ratings')
      .upsert(payload, { onConflict: 'report_id,requester_user_id' })
      .select('*')
      .single();
    if (error) throw error;
    return data as ReportRating;
  },
};


