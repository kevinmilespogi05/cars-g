import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, CheckCircle2 } from 'lucide-react';
import { ACHIEVEMENTS } from '../lib/achievements';

interface Props { userId: string; }

export function AchievementsPanel({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any | null>(null);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!userId) return;
      setLoading(true);
      const [statsRes, earnedRes] = await Promise.all([
        supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', userId)
      ]);
      if (!mounted) return;
      if (statsRes.error) {
        console.error('Error fetching user_stats:', statsRes.error);
        setUserStats(null);
      } else {
        setUserStats(statsRes.data);
      }
      if (earnedRes.error) {
        console.error('Error fetching user_achievements:', earnedRes.error);
        setEarnedIds(new Set());
      } else {
        setEarnedIds(new Set((earnedRes.data || []).map((r: any) => r.achievement_id)));
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [userId]);

  const computed = useMemo(() => {
    if (!userStats) return [] as Array<{ id: string; name: string; description: string; icon?: string; points: number; requirement_type: string; requirement_count: number; unlocked: boolean; progressPct: number }>;
    return ACHIEVEMENTS.map(a => {
      let value = 0;
      switch (a.requirement.type) {
        case 'reports_submitted': value = userStats.reports_submitted || 0; break;
        case 'reports_verified': value = userStats.reports_verified || 0; break;
        case 'reports_resolved': value = userStats.reports_resolved || 0; break;
        case 'days_active': value = userStats.days_active || 0; break;
        case 'points_earned': value = userStats.total_points || 0; break;
      }
      const unlocked = earnedIds.has(a.id);
      const progressPct = Math.min(100, Math.round((value / a.requirement.count) * 100));
      return {
        id: a.id,
        name: a.title,
        description: a.description,
        icon: a.icon,
        points: a.points,
        requirement_type: a.requirement.type,
        requirement_count: a.requirement.count,
        unlocked,
        progressPct
      };
    });
  }, [userStats, earnedIds]);

  const [unlockedCount, totalCount] = useMemo(() => {
    const unlocked = computed.filter(x => x.unlocked).length;
    return [unlocked, computed.length];
  }, [computed]);

  if (!userId) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="text-sm">{unlockedCount} / {totalCount} unlocked</span>
        </div>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {computed.map((r) => (
          <div key={r.id} className={`rounded-lg border p-4 ${r.unlocked ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.unlocked ? 'bg-green-100' : 'bg-gray-100'}`}>
                {r.icon ? (
                  <span className="text-lg" role="img" aria-label="icon">{r.icon}</span>
                ) : (
                  <Trophy className={`w-5 h-5 ${r.unlocked ? 'text-green-600' : 'text-gray-500'}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 truncate">{r.name}</h4>
                  <span className="ml-2 text-xs text-gray-500">{r.points} pts</span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{r.description}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Requirement</span>
                    <span>{r.requirement_type.replace('_', ' ')} · {r.requirement_count}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${r.unlocked ? 'bg-green-500' : 'bg-primary-color/60'}`} style={{ width: `${r.progressPct}%` }} />
                  </div>
                  {r.unlocked && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Unlocked</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AchievementsPanel;


