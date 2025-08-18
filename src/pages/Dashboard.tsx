import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { activityService } from '../services/activityService';
import { Activity, Achievement } from '../types';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (user?.id) {
        try {
          const [activitiesData, achievementsData] = await Promise.all([
            activityService.getRecentActivities(user.id),
            activityService.getLatestAchievements(user.id)
          ]);
          setActivities(activitiesData);
          setAchievements(achievementsData);
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [user?.id]);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Stats Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Your Stats</h2>
          <div className="space-y-2">
            <p className="text-gray-600">Points: <span className="font-medium text-gray-900">{user?.points || 0}</span></p>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-1">
                    <p className="text-gray-800">{activity.description}</p>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No recent activity</p>
          )}
        </div>

        {/* Achievements Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Latest Achievements</h2>
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : achievements.length > 0 ? (
            <div className="space-y-4">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <img
                      src={achievement.icon}
                      alt={achievement.name}
                      className="w-10 h-10 rounded-full"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{achievement.name}</h3>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(achievement.earned_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No achievements yet</p>
          )}
        </div>
      </div>
    </div>
  );
}