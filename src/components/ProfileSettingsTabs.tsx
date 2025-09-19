import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Bell, 
  Shield, 
  Award, 
  Settings, 
  Lock, 
  Eye,
  BarChart3,
  FileText,
  ChevronRight
} from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

interface ProfileSettingsTabsProps {
  user: any;
  isOwnProfile: boolean;
  userStats: any;
  notificationSettings: any;
  onNotificationToggle: (type: 'email' | 'push') => void;
  children: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: User,
    description: 'Profile information and stats',
    color: 'blue'
  },
  {
    id: 'reports',
    label: 'My Reports',
    icon: FileText,
    description: 'View and manage your reports',
    color: 'green'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Manage notification preferences',
    color: 'purple'
  },
  {
    id: 'account',
    label: 'Account',
    icon: Lock,
    description: 'Account settings and security',
    color: 'gray'
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: Award,
    description: 'Track your progress and rewards',
    color: 'yellow'
  },
  {
    id: 'statistics',
    label: 'Statistics',
    icon: BarChart3,
    description: 'View detailed activity stats',
    color: 'indigo'
  }
];

export function ProfileSettingsTabs({ 
  user, 
  isOwnProfile, 
  userStats, 
  notificationSettings, 
  onNotificationToggle,
  children 
}: ProfileSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const getTabColorClasses = (color: string, isActive: boolean) => {
    const colorMap = {
      blue: isActive ? 'bg-blue-500 text-white' : 'text-blue-600 hover:bg-blue-50',
      green: isActive ? 'bg-green-500 text-white' : 'text-green-600 hover:bg-green-50',
      purple: isActive ? 'bg-purple-500 text-white' : 'text-purple-600 hover:bg-purple-50',
      gray: isActive ? 'bg-gray-500 text-white' : 'text-gray-600 hover:bg-gray-50',
      yellow: isActive ? 'bg-yellow-500 text-white' : 'text-yellow-600 hover:bg-yellow-50',
      indigo: isActive ? 'bg-indigo-500 text-white' : 'text-indigo-600 hover:bg-indigo-50'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const filteredTabs = tabs.filter(tab => {
    if (!isOwnProfile) {
      // For other users' profiles, only show overview and reports
      return ['overview', 'reports'].includes(tab.id);
    }
    
    if (user?.role === 'patrol') {
      // For patrol users, exclude achievements
      return tab.id !== 'achievements';
    }
    
    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:w-80 flex-shrink-0">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden sticky top-6">
          <div className="px-6 py-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-600 mt-1">
              {isOwnProfile ? 'Manage your profile and preferences' : 'View profile information'}
            </p>
          </div>
          
          <nav className="p-4">
            <div className="space-y-2">
              {filteredTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                      isActive 
                        ? 'shadow-md' 
                        : 'hover:shadow-sm'
                    } ${getTabColorClasses(tab.color, isActive)}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`p-2 rounded-lg transition-colors duration-200 ${
                      isActive 
                        ? 'bg-white/20' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{tab.label}</div>
                      <div className={`text-xs truncate ${
                        isActive ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        {tab.description}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${
                      isActive ? 'rotate-90' : 'group-hover:translate-x-1'
                    }`} />
                  </motion.button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {React.cloneElement(children as React.ReactElement, { 
                activeTab, 
                user, 
                isOwnProfile, 
                userStats, 
                notificationSettings, 
                onNotificationToggle 
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
