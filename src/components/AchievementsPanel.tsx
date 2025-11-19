import React, { useEffect, useState } from 'react';
import { Trophy, CheckCircle2, RefreshCw } from 'lucide-react';
import { getUserAchievementProgress, clearUserStatsCache } from '../lib/achievements';
import { AchievementBadge } from './ui/AchievementBadge';

interface Props { 
  userId: string; 
  onAchievementUnlocked?: (achievementId: string) => void;
}

export function AchievementsPanel({ userId, onAchievementUnlocked }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [achievementProgress, setAchievementProgress] = useState<{
    achievements: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      points: number;
      requirement: { type: string; count: number };
      unlocked: boolean;
      progress: number;
      currentValue: number;
    }>;
    unlockedCount: number;
    totalCount: number;
  }>({
    achievements: [],
    unlockedCount: 0,
    totalCount: 0
  });

  const loadAchievements = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        clearUserStatsCache(userId);
      } else {
        setLoading(true);
      }

      const progress = await getUserAchievementProgress(userId);
      setAchievementProgress(progress);

      // Check for newly unlocked achievements
      if (isRefresh && progress.unlockedCount > achievementProgress.unlockedCount) {
        const newlyUnlocked = progress.achievements.filter(
          a => a.unlocked && !achievementProgress.achievements.find(
            existing => existing.id === a.id && existing.unlocked
          )
        );
        
        newlyUnlocked.forEach(achievement => {
          onAchievementUnlocked?.(achievement.id);
        });
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadAchievements();
    }
  }, [userId]);

  const handleRefresh = () => {
    loadAchievements(true);
  };

  if (!userId) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-medium">
            {achievementProgress.unlockedCount} / {achievementProgress.totalCount} unlocked
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(loading || refreshing) && (
            <span className="text-xs text-gray-500">
              {refreshing ? 'Refreshing...' : 'Loading…'}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh achievements"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievementProgress.achievements.map((achievement) => (
          <AchievementBadge
            key={achievement.id}
            achievement={{
              id: achievement.id,
              title: achievement.title,
              description: achievement.description,
              icon: achievement.icon,
              points: achievement.points,
              unlocked: achievement.unlocked,
              progress: achievement.progress,
              currentValue: achievement.currentValue,
              requirement: achievement.requirement
            }}
            size="md"
            showProgress={!achievement.unlocked}
            className="h-full"
          />
        ))}
      </div>

      {achievementProgress.achievements.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No achievements available</p>
        </div>
      )}
    </div>
  );
}

export default AchievementsPanel;


