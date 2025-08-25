import { reportsService } from './reportsService';
import { awardPoints } from './points';
import { activityService } from './activityService';

export type QueuedReport = {
  id: string; // local temp id
  created_at: string;
  payload: any; // matches reportData shape used by createReport
};

const STORAGE_KEY = 'queuedReports';

function readQueue(): QueuedReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedReport[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch {}
}

export function enqueueReport(payload: any) {
  const queue = readQueue();
  const item: QueuedReport = {
    id: `queued_${Date.now()}`,
    created_at: new Date().toISOString(),
    payload,
  };
  queue.push(item);
  writeQueue(queue);
}

export async function flushQueuedReports(): Promise<number> {
  const queue = readQueue();
  if (!navigator.onLine || queue.length === 0) return 0;

  let success = 0;
  const remaining: QueuedReport[] = [];

  for (const item of queue) {
    try {
      const created = await reportsService.createReport(item.payload);
      try { await awardPoints(item.payload.user_id, 'REPORT_SUBMITTED', created.id); } catch {}
      try { await activityService.trackReportCreated(item.payload.user_id, created.id); } catch {}
      success++;
    } catch (e) {
      // Keep in queue if still failing
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return success;
}


