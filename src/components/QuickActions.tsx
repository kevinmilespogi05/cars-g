import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  MessageCircle, 
  Award, 
  MapPin, 
  Bell,
  Camera,
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  bgColor: string;
}

export function QuickActions() {
  const { user } = useAuthStore();

  const getQuickActions = (): QuickAction[] => {
    if (user?.role === 'admin') {
      return [
        {
          id: 'map',
          title: 'Map View',
          description: 'Monitor community areas',
          icon: MapPin,
          path: '/admin/map',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        },
        {
          id: 'chat',
          title: 'Chat',
          description: 'Communicate with team',
          icon: MessageCircle,
          path: '/chat',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100'
        },
        {
          id: 'leaderboard',
          title: 'Leaderboard',
          description: 'View community stats',
          icon: Award,
          path: '/leaderboard',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100'
        }
      ];
    } else if (user?.role === 'patrol') {
      return [
        // Patrol users don't need quick actions since they're already on their dashboard
        // and can't access chat
      ];
    } else {
      return [
        {
          id: 'create-report',
          title: 'Report Issue',
          description: 'Report a community problem',
          icon: Plus,
          path: '/reports/create',
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        },
        {
          id: 'view-reports',
          title: 'My Reports',
          description: 'Track your reports',
          icon: FileText,
          path: '/reports',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        },
        {
          id: 'chat',
          title: 'Community Chat',
          description: 'Connect with neighbors',
          icon: MessageCircle,
          path: '/chat',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100'
        },
        {
          id: 'leaderboard',
          title: 'Leaderboard',
          description: 'See community rankings',
          icon: Award,
          path: '/leaderboard',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100'
        }
      ];
    }
  };

  const quickActions = getQuickActions();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <p className="text-sm text-gray-600">Access your most common tasks</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Link
              to={action.path}
              className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex flex-col items-center text-center">
                <div className={`h-12 w-12 ${action.bgColor} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <h3 className="font-medium text-gray-900 text-sm mb-1">
                  {action.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {action.description}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Emergency Actions */}
      {user?.role !== 'admin' && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Emergency Actions</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/reports/create?priority=urgent"
              className="flex items-center justify-center px-4 py-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors group"
            >
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-700">Report Emergency</span>
            </Link>
            <Link
              to="/reports/create"
              className="flex items-center justify-center px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
            >
              <Camera className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-700">Report with Photo</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
