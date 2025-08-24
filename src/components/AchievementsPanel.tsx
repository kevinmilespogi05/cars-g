import React, { useEffect, useState } from 'react';
import { Trophy, CheckCircle2, RefreshCw } from 'lucide-react';
import { getUserAchievementProgress, clearUserStatsCache } from '../lib/achievements';

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {achievementProgress.achievements.map((achievement) => (
          <div 
            key={achievement.id} 
            className={`rounded-lg border p-4 transition-all duration-200 ${
              achievement.unlocked 
                ? 'border-green-200 bg-green-50 shadow-sm' 
                : 'border-gray-200 bg-white hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                achievement.unlocked ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {achievement.icon ? (
                  <span className="text-lg" role="img" aria-label="icon">{achievement.icon}</span>
                ) : (
                  <Trophy className={`w-5 h-5 ${achievement.unlocked ? 'text-green-600' : 'text-gray-500'}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 truncate">{achievement.title}</h4>
                  <span className="ml-2 text-xs text-gray-500">{achievement.points} pts</span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{achievement.description}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{achievement.currentValue} / {achievement.requirement.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        achievement.unlocked ? 'bg-green-500' : 'bg-blue-500'
                      }`} 
                      style={{ width: `${achievement.progress}%` }} 
                    />
                  </div>
                  {achievement.unlocked && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Unlocked!</span>
                    </div>
                  )}
                  {!achievement.unlocked && achievement.progress > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      {achievement.progress}% complete
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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


