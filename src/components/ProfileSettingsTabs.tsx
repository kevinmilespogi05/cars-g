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
  const mobileNavRef = React.useRef<HTMLDivElement | null>(null);
  const tabBtnRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyNavigate = (e: React.KeyboardEvent<HTMLDivElement | HTMLButtonElement>) => {
    const enabledTabs = filteredTabs.map(t => t.id);
    const idx = enabledTabs.indexOf(activeTab);
    if (idx === -1) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = enabledTabs[(idx + 1) % enabledTabs.length];
      setActiveTab(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = enabledTabs[(idx - 1 + enabledTabs.length) % enabledTabs.length];
      setActiveTab(prev);
    }
  };

  // Load last active tab from localStorage and persist changes
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('profileActiveTab');
      const validIds = (tabs.filter(t => filteredTabs.find(ft => ft.id === t.id))).map(t => t.id);
      if (saved && validIds.includes(saved)) {
        setActiveTab(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem('profileActiveTab', activeTab); } catch {}
    // Ensure the active tab is scrolled into view on mobile
    const el = tabBtnRefs.current[activeTab];
    if (el && mobileNavRef.current) {
      const parent = mobileNavRef.current;
      const left = el.offsetLeft - 16; // small padding
      parent.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activeTab]);

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
      {/* Mobile Top Tabs */}
      <div className="lg:hidden">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden sticky top-16 z-20">
          <div className="px-4 py-3 border-b border-gray-200/60">
            <h2 className="text-base font-semibold text-gray-900">Settings</h2>
            <p className="text-xs text-gray-500">
              {isOwnProfile ? 'Manage your profile and preferences' : 'View profile information'}
            </p>
          </div>
          <nav
            className="relative px-2 py-2 overflow-x-auto whitespace-nowrap [-webkit-overflow-scrolling:touch] snap-x snap-mandatory"
            role="tablist"
            aria-label="Profile settings"
            onKeyDown={onKeyNavigate}
            ref={mobileNavRef}
          >
            {/* left/right fade shadows */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent" />
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 mr-2 mb-2 rounded-full text-sm font-medium border transition-all snap-start ${
                    isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
                  }`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tab-panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  ref={(r) => { tabBtnRefs.current[tab.id] = r; }}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  {tab.label}
                  {/* Tab badges for quick status context */}
                  {tab.id === 'reports' && (user?.role === 'patrol'
                    ? (
                      <span className={`ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {userStats?.patrol_reports_completed ?? 0}
                      </span>
                    ) : (
                      <span className={`ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {userStats?.reports_submitted ?? 0}
                      </span>
                    )
                  )}
                  {tab.id === 'notifications' && (
                    <span className={`ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {(notificationSettings?.email ? 1 : 0) + (notificationSettings?.push ? 1 : 0)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Navigation (desktop) */}
      <div className="hidden lg:block lg:w-80 flex-shrink-0">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden sticky top-6">
          <div className="px-6 py-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-600 mt-1">
              {isOwnProfile ? 'Manage your profile and preferences' : 'View profile information'}
            </p>
          </div>
          <nav className="p-4" role="tablist" aria-label="Profile settings (desktop)">
            <div className="space-y-2">
              {filteredTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
              <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                      isActive ? 'shadow-md' : 'hover:shadow-sm'
                    } ${getTabColorClasses(tab.color, isActive)}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tab-panel-${tab.id}`}
                    id={`tab-${tab.id}`}
                  >
                    <div className={`p-2 rounded-lg transition-colors duration-200 ${
                      isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{tab.label}</div>
                      <div className={`text-xs truncate ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                        {tab.description}
                      </div>
                    </div>
                    {/* Desktop badges */}
                    {tab.id === 'reports' && (user?.role === 'patrol'
                      ? (
                        <span className={`ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-700'}`}>
                          {userStats?.patrol_reports_completed ?? 0}
                        </span>
                      ) : (
                        <span className={`ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-700'}`}>
                          {userStats?.reports_submitted ?? 0}
                        </span>
                      )
                    )}
                    {tab.id === 'notifications' && (
                      <span className={`ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-700'}`}>
                        {(notificationSettings?.email ? 1 : 0) + (notificationSettings?.push ? 1 : 0)}
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
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
              role="tabpanel"
              id={`tab-panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
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
