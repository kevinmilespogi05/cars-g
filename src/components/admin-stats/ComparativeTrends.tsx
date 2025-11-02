import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface TrendData {
  current: number;
  previous: number;
  label: string;
  format?: 'number' | 'percentage' | 'time';
}

interface ComparativeTrendsProps {
  trends: TrendData[];
  periodLabel?: string;
}

export function ComparativeTrends({ trends, periodLabel = 'vs previous period' }: ComparativeTrendsProps) {
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) {
      return {
        direction: current > 0 ? 'up' : current < 0 ? 'down' : 'neutral',
        percentage: current > 0 ? 100 : 0,
        isInfinite: current > 0,
      };
    }
    const change = current - previous;
    const percentage = (change / previous) * 100;
    return {
      direction: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral',
      percentage: Math.abs(percentage),
      isInfinite: false,
    };
  };

  const getTrendColor = (direction: string, isPositive: boolean = true) => {
    if (direction === 'neutral') return 'text-gray-500';
    const isGood = (direction === 'up' && isPositive) || (direction === 'down' && !isPositive);
    return isGood ? 'text-green-600' : 'text-red-600';
  };

  const getTrendBgColor = (direction: string, isPositive: boolean = true) => {
    if (direction === 'neutral') return 'bg-gray-50';
    const isGood = (direction === 'up' && isPositive) || (direction === 'down' && !isPositive);
    return isGood ? 'bg-green-50' : 'bg-red-50';
  };

  const formatValue = (value: number, format: 'number' | 'percentage' | 'time' = 'number') => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        const hours = Math.floor(value / 60);
        const minutes = value % 60;
        return `${hours}h ${minutes}m`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Comparative Trends</h3>
        <p className="text-sm text-gray-500 mt-1">{periodLabel}</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trends.map((trend, index) => {
            const trendData = calculateTrend(trend.current, trend.previous);
            // Determine if upward trend is positive (e.g., for resolved reports yes, for pending no)
            const isPositiveTrend = !trend.label.toLowerCase().includes('pending') && 
                                   !trend.label.toLowerCase().includes('declined') &&
                                   !trend.label.toLowerCase().includes('banned');

            return (
              <div
                key={index}
                className={`relative overflow-hidden rounded-lg border border-gray-200 p-4 transition-all hover:shadow-md ${getTrendBgColor(trendData.direction, isPositiveTrend)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {trend.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatValue(trend.current, trend.format)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`flex items-center gap-1 ${getTrendColor(trendData.direction, isPositiveTrend)}`}>
                        {trendData.direction === 'up' && <ArrowUpRight className="h-4 w-4" />}
                        {trendData.direction === 'down' && <ArrowDownRight className="h-4 w-4" />}
                        {trendData.direction === 'neutral' && <Minus className="h-4 w-4" />}
                        <span className="text-sm font-semibold">
                          {trendData.isInfinite ? 'New!' : `${trendData.percentage.toFixed(1)}%`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {trendData.direction === 'neutral' ? 'No change' : ''}
                      </span>
                    </div>
                  </div>
                  
                  {/* Trend Indicator */}
                  <div className={`flex-shrink-0 p-2 rounded-lg ${
                    trendData.direction === 'up' ? 'bg-green-100' :
                    trendData.direction === 'down' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {trendData.direction === 'up' && <TrendingUp className={`h-6 w-6 ${getTrendColor('up', isPositiveTrend)}`} />}
                    {trendData.direction === 'down' && <TrendingDown className={`h-6 w-6 ${getTrendColor('down', isPositiveTrend)}`} />}
                    {trendData.direction === 'neutral' && <Minus className="h-6 w-6 text-gray-500" />}
                  </div>
                </div>

                {/* Previous period value */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Previous: {formatValue(trend.previous, trend.format)}
                  </p>
                </div>

                {/* Moving Average Indicator (decorative) */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-50"></div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Improving Metrics</p>
            <p className="text-2xl font-bold text-green-600">
              {trends.filter(t => {
                const trend = calculateTrend(t.current, t.previous);
                return trend.direction === 'up';
              }).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Declining Metrics</p>
            <p className="text-2xl font-bold text-red-600">
              {trends.filter(t => {
                const trend = calculateTrend(t.current, t.previous);
                return trend.direction === 'down';
              }).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Stable Metrics</p>
            <p className="text-2xl font-bold text-gray-600">
              {trends.filter(t => {
                const trend = calculateTrend(t.current, t.previous);
                return trend.direction === 'neutral';
              }).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

