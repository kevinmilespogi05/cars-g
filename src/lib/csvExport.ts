import type { Report } from '../types';
import type { ReportStats } from './reportStats';

interface ExportOptions {
  reports: Report[];
  stats?: ReportStats;
  filename: string;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadBlobCsv(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export reports (and optional summary stats) as a CSV file that opens cleanly in Excel.
 */
export function exportReportsCsv({ reports, stats, filename }: ExportOptions) {
  const lines: string[] = [];

  // Optional summary header section
  if (stats) {
    lines.push('# Summary');
    lines.push(`# Total Reports,${escapeCsvValue(stats.total)}`);
    lines.push(`# Pending,${escapeCsvValue(stats.pending)}`);
    lines.push(`# In Progress,${escapeCsvValue(stats.inProgress)}`);
    lines.push(`# Resolved,${escapeCsvValue(stats.resolved)}`);
    lines.push(`# Declined,${escapeCsvValue(stats.declined)}`);
    lines.push(`# High Priority,${escapeCsvValue(stats.highPriority)}`);
    lines.push('');
  }

  // Detail header row
  const headers = [
    'id',
    'case_number',
    'title',
    'description',
    'category',
    'status',
    'priority',
    'is_anonymous',
    'reporter_username',
    'created_at',
    'updated_at',
    'location_address',
    'likes_count',
    'comments_count',
  ];
  lines.push(headers.join(','));

  // Detail rows
  for (const r of reports) {
    const row = [
      escapeCsvValue(r.id),
      escapeCsvValue((r as any).case_number ?? ''),
      escapeCsvValue(r.title),
      escapeCsvValue(r.description),
      escapeCsvValue(r.category),
      escapeCsvValue(r.status),
      escapeCsvValue((r as any).priority ?? ''),
      escapeCsvValue((r as any).is_anonymous ?? false),
      escapeCsvValue((r as any).user_profile?.username ?? ''),
      escapeCsvValue(r.created_at),
      escapeCsvValue((r as any).updated_at ?? ''),
      escapeCsvValue((r as any).location_address ?? ''),
      escapeCsvValue((r as any).likes?.count ?? 0),
      escapeCsvValue((r as any).comments?.count ?? 0),
    ];
    lines.push(row.join(','));
  }

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlobCsv(blob, filename);
}


