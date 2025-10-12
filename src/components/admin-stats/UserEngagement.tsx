import React from 'react';
import { Users, UserCheck, UserPlus, TrendingUp, Activity, Award } from 'lucide-react';

export interface UserEngagementData {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  powerUsers: number;
  retentionRate: number;
  churnRate: number;
  activityHeatmap: Array<{ hour: number; day: string; count: number }>;
  topUsers: Array<{ id: string; name: string; reportCount: number; avatar?: string }>;
}

interface UserEngagementProps {
  data: UserEngagementData;
  onUserClick?: (userId: string) => void;
}

export function UserEngagement({ data, onUserClick }: UserEngagementProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['12am', '6am', '12pm', '6pm'];

  // Create heatmap matrix
  const getHeatmapIntensity = (count: number) => {
    const maxCount = Math.max(...data.activityHeatmap.map(d => d.count));
    if (maxCount === 0) return 0;
    return (count / maxCount) * 100;
  };

  const getHeatmapColor = (intensity: number) => {
    if (intensity === 0) return 'bg-gray-100';
    if (intensity < 20) return 'bg-blue-100';
    if (intensity < 40) return 'bg-blue-200';
    if (intensity < 60) return 'bg-blue-300';
    if (intensity < 80) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">User Engagement</h3>
          </div>
          <span className="text-sm text-gray-500">Last 30 days</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{data.totalUsers}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <span className="text-xs font-semibold text-green-700 bg-green-200 px-2 py-1 rounded">
                {data.totalUsers > 0 ? ((data.activeUsers / data.totalUsers) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Active Users</p>
            <p className="text-2xl font-bold text-gray-900">{data.activeUsers}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <UserPlus className="h-5 w-5 text-purple-600" />
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">New Users</p>
            <p className="text-2xl font-bold text-gray-900">{data.newUsers}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-5 w-5 text-orange-600" />
              <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-1 rounded">
                10+ reports
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Power Users</p>
            <p className="text-2xl font-bold text-gray-900">{data.powerUsers}</p>
          </div>
        </div>

        {/* Retention Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <p className="text-sm font-medium text-gray-700">Retention Rate</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{data.retentionRate.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${data.retentionRate}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Users who returned this month</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <p className="text-sm font-medium text-gray-700">Churn Rate</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{data.churnRate.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${data.churnRate}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Users lost this month</p>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Activity Heatmap</h4>
          <p className="text-xs text-gray-500 mb-3">When users are most active</p>
          
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Hours header */}
              <div className="flex mb-2">
                <div className="w-12"></div>
                {hours.map((hour, idx) => (
                  <div key={hour} className="flex-1 text-center">
                    <span className="text-xs text-gray-500">{hour}</span>
                  </div>
                ))}
              </div>
              
              {/* Heatmap grid */}
              {days.map((day, dayIdx) => (
                <div key={day} className="flex mb-1">
                  <div className="w-12 flex items-center">
                    <span className="text-xs text-gray-600 font-medium">{day}</span>
                  </div>
                  <div className="flex-1 flex gap-1">
                    {Array.from({ length: 24 }).map((_, hourIdx) => {
                      const dataPoint = data.activityHeatmap.find(
                        d => d.day === day && d.hour === hourIdx
                      );
                      const intensity = dataPoint ? getHeatmapIntensity(dataPoint.count) : 0;
                      return (
                        <div
                          key={hourIdx}
                          className={`flex-1 h-8 rounded ${getHeatmapColor(intensity)} transition-all hover:ring-2 hover:ring-blue-400 cursor-pointer group relative`}
                          title={`${day} ${hourIdx}:00 - ${dataPoint?.count || 0} activities`}
                        >
                          <span className="hidden group-hover:block absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            {dataPoint?.count || 0} activities
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-xs text-gray-500">Less</span>
                <div className="w-4 h-4 rounded bg-gray-100"></div>
                <div className="w-4 h-4 rounded bg-blue-100"></div>
                <div className="w-4 h-4 rounded bg-blue-200"></div>
                <div className="w-4 h-4 rounded bg-blue-300"></div>
                <div className="w-4 h-4 rounded bg-blue-400"></div>
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-xs text-gray-500">More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Active Users */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-600" />
              <h4 className="text-sm font-semibold text-gray-900">Most Active Users</h4>
            </div>
            <span className="text-xs text-gray-500">By report count</span>
          </div>
          
          <div className="space-y-2">
            {data.topUsers.slice(0, 5).map((user, index) => (
              <button
                key={user.id}
                onClick={() => onUserClick?.(user.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all group"
              >
                <div className="flex-shrink-0 flex items-center gap-3">
                  <span className={`text-sm font-bold ${
                    index === 0 ? 'text-yellow-600' :
                    index === 1 ? 'text-gray-400' :
                    index === 2 ? 'text-orange-600' :
                    'text-gray-500'
                  }`}>
                    #{index + 1}
                  </span>
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">{user.reportCount} reports submitted</p>
                </div>
                {index < 3 && (
                  <Award className={`h-5 w-5 ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    'text-orange-500'
                  }`} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

