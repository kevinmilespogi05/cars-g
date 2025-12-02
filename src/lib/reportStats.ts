import type { Report } from '../types';

export interface ReportStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  declined: number;
  highPriority: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  avgResolutionTime?: number;
  resolvedThisMonth?: number;
}

/**
 * Build aggregate statistics for a list of reports.
 * This is used by both the admin UI and the PDF report generator.
 */
export function buildReportStats(items: Report[]): ReportStats {
  const stats: ReportStats = {
    total: items.length,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    declined: 0,
    highPriority: 0,
    byCategory: {},
    byStatus: {},
    byPriority: {},
  };

  items.forEach((r) => {
    // Status buckets
    const status = r.status;
    if (status) {
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      if (status === 'pending') stats.pending += 1;
      if (status === 'in_progress') stats.inProgress += 1;
      if (status === 'resolved') stats.resolved += 1;
      if (status === 'declined') stats.declined += 1;
    }

    // Category buckets
    const category = r.category || 'uncategorized';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

    // Priority buckets
    const priority = r.priority || 'medium';
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    if (priority === 'high') stats.highPriority += 1;
  });

  return stats;
}


