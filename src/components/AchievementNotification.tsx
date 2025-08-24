import React, { useState, useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AchievementNotificationProps {
  achievementId: string;
  title: string;
  points: number;
  icon: string;
  onClose: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievementId,
  title,
  points,
  icon,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, 5000); // Show for 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-4 right-4 z-50 max-w-sm w-full"
        >
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-lg border border-yellow-300 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl" role="img" aria-label="achievement icon">
                    {icon}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg truncate">
                    Achievement Unlocked!
                  </h3>
                  <button
                    onClick={() => {
                      setIsVisible(false);
                      setTimeout(onClose, 300);
                    }}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-white/90 text-sm mt-1 font-medium">
                  {title}
                </p>
                
                <div className="flex items-center gap-2 mt-2">
                  <Trophy className="w-4 h-4 text-white" />
                  <span className="text-white/90 text-sm">
                    +{points} points earned!
                  </span>
                </div>
              </div>
            </div>
            
            {/* Progress bar animation */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-1 bg-white/30 rounded-full mt-3 overflow-hidden"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="h-full bg-white rounded-full"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Global achievement notification manager
class AchievementNotificationManager {
  private notifications: Array<{
    id: string;
    achievementId: string;
    title: string;
    points: number;
    icon: string;
  }> = [];
  private listeners: Set<(notifications: typeof this.notifications) => void> = new Set();

  addNotification(achievementId: string, title: string, points: number, icon: string) {
    const id = `${achievementId}_${Date.now()}`;
    this.notifications.push({ id, achievementId, title, points, icon });
    this.notifyListeners();
    
    // Auto-remove after 6 seconds
    setTimeout(() => {
      this.removeNotification(id);
    }, 6000);
  }

  removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  subscribe(listener: (notifications: typeof this.notifications) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
}

export const achievementNotificationManager = new AchievementNotificationManager();

// Hook to use achievement notifications
export const useAchievementNotifications = () => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    achievementId: string;
    title: string;
    points: number;
    icon: string;
  }>>([]);

  useEffect(() => {
    const unsubscribe = achievementNotificationManager.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const removeNotification = (id: string) => {
    achievementNotificationManager.removeNotification(id);
  };

  return { notifications, removeNotification };
};
