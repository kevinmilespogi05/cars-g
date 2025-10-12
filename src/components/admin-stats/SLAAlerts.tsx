import React from 'react';
import { AlertTriangle, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

export interface SLAData {
  withinTarget: number;
  warning: number;
  breached: number;
  targetHours: number;
  warningHours: number;
  breachHours: number;
  criticalIssues: Array<{
    id: string;
    title: string;
    age: number;
    severity: 'warning' | 'critical';
  }>;
}

interface SLAAlertsProps {
  slaData: SLAData;
  onViewDetails?: (severity: 'target' | 'warning' | 'breached') => void;
}

export function SLAAlerts({ slaData, onViewDetails }: SLAAlertsProps) {
  const total = slaData.withinTarget + slaData.warning + slaData.breached;
  const breachPercentage = total > 0 ? (slaData.breached / total) * 100 : 0;
  const warningPercentage = total > 0 ? (slaData.warning / total) * 100 : 0;
  const targetPercentage = total > 0 ? (slaData.withinTarget / total) * 100 : 0;

  const getOverallStatus = () => {
    if (breachPercentage > 20) return { status: 'critical', color: 'red', text: 'Critical' };
    if (breachPercentage > 10 || warningPercentage > 30) return { status: 'warning', color: 'yellow', text: 'Needs Attention' };
    return { status: 'good', color: 'green', text: 'Healthy' };
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header with Overall Status */}
      <div className={`px-6 py-4 border-b rounded-t-lg ${
        overallStatus.status === 'critical' ? 'bg-red-50 border-red-200' :
        overallStatus.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
        'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {overallStatus.status === 'critical' && <AlertCircle className="h-6 w-6 text-red-600" />}
            {overallStatus.status === 'warning' && <AlertTriangle className="h-6 w-6 text-yellow-600" />}
            {overallStatus.status === 'good' && <CheckCircle className="h-6 w-6 text-green-600" />}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">SLA Performance</h3>
              <p className={`text-sm font-medium ${
                overallStatus.status === 'critical' ? 'text-red-700' :
                overallStatus.status === 'warning' ? 'text-yellow-700' :
                'text-green-700'
              }`}>
                Status: {overallStatus.text}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Reports</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* SLA Bands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Within Target */}
          <button
            onClick={() => onViewDetails?.('target')}
            className="relative overflow-hidden rounded-lg border-2 border-green-200 bg-green-50 p-4 text-left transition-all hover:shadow-lg hover:border-green-300 group"
          >
            <div className="flex items-start justify-between mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                ≤ {slaData.targetHours}h
              </span>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Within Target</p>
            <p className="text-3xl font-bold text-green-600">{slaData.withinTarget}</p>
            <p className="text-xs text-green-700 mt-2">{targetPercentage.toFixed(1)}% of total</p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-600" style={{ width: `${targetPercentage}%` }}></div>
          </button>

          {/* Warning */}
          <button
            onClick={() => onViewDetails?.('warning')}
            className="relative overflow-hidden rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 text-left transition-all hover:shadow-lg hover:border-yellow-300 group"
          >
            <div className="flex items-start justify-between mb-2">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                {slaData.targetHours}h - {slaData.warningHours}h
              </span>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Warning Zone</p>
            <p className="text-3xl font-bold text-yellow-600">{slaData.warning}</p>
            <p className="text-xs text-yellow-700 mt-2">{warningPercentage.toFixed(1)}% of total</p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-600" style={{ width: `${warningPercentage}%` }}></div>
          </button>

          {/* Breached */}
          <button
            onClick={() => onViewDetails?.('breached')}
            className="relative overflow-hidden rounded-lg border-2 border-red-200 bg-red-50 p-4 text-left transition-all hover:shadow-lg hover:border-red-300 group"
          >
            <div className="flex items-start justify-between mb-2">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
                &gt; {slaData.warningHours}h
              </span>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">SLA Breached</p>
            <p className="text-3xl font-bold text-red-600">{slaData.breached}</p>
            <p className="text-xs text-red-700 mt-2">{breachPercentage.toFixed(1)}% of total</p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600" style={{ width: `${breachPercentage}%` }}></div>
          </button>
        </div>

        {/* Critical Issues List */}
        {slaData.criticalIssues && slaData.criticalIssues.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h4 className="text-sm font-semibold text-gray-900">
                Critical Issues Requiring Immediate Attention
              </h4>
              <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
                {slaData.criticalIssues.length}
              </span>
            </div>
            
            <div className="space-y-2">
              {slaData.criticalIssues.slice(0, 5).map((issue) => (
                <div
                  key={issue.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    issue.severity === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                      issue.severity === 'critical' ? 'bg-red-600' : 'bg-yellow-600'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {issue.title}
                      </p>
                      <p className={`text-xs ${
                        issue.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
                      }`}>
                        Open for {issue.age}h - {issue.severity === 'critical' ? 'Critical' : 'Warning'}
                      </p>
                    </div>
                  </div>
                  <Clock className={`flex-shrink-0 h-4 w-4 ml-2 ${
                    issue.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                </div>
              ))}
            </div>

            {slaData.criticalIssues.length > 5 && (
              <button
                onClick={() => onViewDetails?.('breached')}
                className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all {slaData.criticalIssues.length} critical issues →
              </button>
            )}
          </div>
        )}

        {/* Performance Metrics */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">SLA Compliance</p>
              <p className="text-2xl font-bold text-gray-900">{targetPercentage.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-2">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Target SLA</p>
              <p className="text-2xl font-bold text-gray-900">{slaData.targetHours}h</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-2">
                <AlertCircle className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">At Risk</p>
              <p className="text-2xl font-bold text-gray-900">{slaData.warning + slaData.breached}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

