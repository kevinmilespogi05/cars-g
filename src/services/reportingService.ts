import { caseService } from './caseService';
import type { Report } from '../types';
import { buildReportStats, type ReportStats } from '../lib/reportStats';

export interface ReportSummary {
  reports: Report[];
  stats: ReportStats;
}

export const reportingService = {
  async getMonthlyReportSummary(params: {
    year: number;
    month: number;
    status?: string;
  }): Promise<ReportSummary> {
    const { year, month, status } = params;
    const reports = (await caseService.getMonthlyCases(year, month, status)) as Report[];
    const stats = buildReportStats(reports);
    return { reports, stats };
  },

  async getYearlyReportSummary(params: {
    year: number;
    status?: string;
  }): Promise<ReportSummary> {
    const { year, status } = params;
    const reports = (await caseService.getYearlyCases(year, status)) as Report[];
    const stats = buildReportStats(reports);
    return { reports, stats };
  },
};


