import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Award, Trophy, Star, Flame, CheckCircle } from 'lucide-react';

export interface AchievementBadgeProps {
  achievement: {
    id: string;
    title: string;
    description: string;
    icon: string;
    points: number;
    unlocked: boolean;
    progress?: number;
    currentValue?: number;
    requirement?: { count: number };
  };
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: {
    container: 'w-16 h-16',
    icon: 'text-2xl',
    title: 'text-xs',
    points: 'text-[10px]'
  },
  md: {
    container: 'w-24 h-24',
    icon: 'text-3xl',
    title: 'text-sm',
    points: 'text-xs'
  },
  lg: {
    container: 'w-32 h-32',
    icon: 'text-4xl',
    title: 'text-base',
    points: 'text-sm'
  }
};

export function AchievementBadge({
  achievement,
  size = 'md',
  showProgress = false,
  className,
  onClick
}: AchievementBadgeProps) {
  const sizeClass = sizeClasses[size];
  const isUnlocked = achievement.unlocked;

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl p-3 transition-all',
        isUnlocked
          ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 shadow-md'
          : 'bg-gray-100 border-2 border-gray-300 opacity-60',
        onClick && 'cursor-pointer hover:shadow-lg',
        className
      )}
    >
      {/* Badge Icon */}
      <div className={cn(
        'mb-2 flex items-center justify-center',
        sizeClass.icon
      )}>
        {achievement.icon || '🏆'}
      </div>

      {/* Unlocked Indicator */}
      {isUnlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5"
        >
          <CheckCircle className="h-3 w-3 text-white" />
        </motion.div>
      )}

      {/* Title */}
      {size !== 'sm' && (
        <div className={cn(
          'font-semibold text-center mb-1 line-clamp-1',
          isUnlocked ? 'text-gray-900' : 'text-gray-500',
          sizeClass.title
        )}>
          {achievement.title}
        </div>
      )}

      {/* Points */}
      <div className={cn(
        'font-medium',
        isUnlocked ? 'text-amber-600' : 'text-gray-400',
        sizeClass.points
      )}>
        +{achievement.points} pts
      </div>

      {/* Progress Bar */}
      {showProgress && !isUnlocked && achievement.progress !== undefined && (
        <div className="w-full mt-2">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${achievement.progress}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-blue-500"
            />
          </div>
          {achievement.currentValue !== undefined && achievement.requirement && (
            <div className="text-[10px] text-gray-500 mt-0.5 text-center">
              {achievement.currentValue}/{achievement.requirement.count}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Compact badge for lists
export function AchievementBadgeCompact({ achievement }: { achievement: AchievementBadgeProps['achievement'] }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl',
        achievement.unlocked
          ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-300'
          : 'bg-gray-100 border border-gray-300 opacity-60'
      )}>
        {achievement.icon || '🏆'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium text-sm',
            achievement.unlocked ? 'text-gray-900' : 'text-gray-500'
          )}>
            {achievement.title}
          </span>
          {achievement.unlocked && (
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-500 line-clamp-1">{achievement.description}</p>
      </div>
      <div className="text-xs font-semibold text-amber-600">
        +{achievement.points}
      </div>
    </div>
  );
}

