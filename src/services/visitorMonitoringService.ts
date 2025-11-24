import { getApiUrl } from '../lib/config';
import { authenticatedRequest } from '../lib/jwt';

export interface Visitor {
  id: string;
  visitor_id: string;
  first_visit_at: string;
  last_visit_at: string;
  visit_count: number;
  user_agent: string | null;
  user_id: string | null;
  profiles?: {
    id: string;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export interface VisitorListResponse {
  success: boolean;
  data: Visitor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VisitorStats {
  totalVisitors: number;
  anonymousVisitors: number;
  authenticatedVisitors: number;
  newVisitorsToday: number;
  newVisitorsThisWeek: number;
  newVisitorsThisMonth: number;
  dailyTrends: Record<string, number>;
}

export interface VisitorStatsResponse {
  success: boolean;
  stats: VisitorStats;
}

export interface GetVisitorsParams {
  page?: number;
  limit?: number;
  type?: 'all' | 'anonymous' | 'authenticated';
  sortBy?: 'first_visit_at' | 'last_visit_at' | 'visit_count' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * Get paginated list of visitors with filtering
 */
export async function getVisitors(params: GetVisitorsParams = {}): Promise<VisitorListResponse> {
  const {
    page = 1,
    limit = 50,
    type = 'all',
    sortBy = 'last_visit_at',
    sortOrder = 'desc',
    search = ''
  } = params;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    type,
    sortBy,
    sortOrder
  });

  if (search) {
    queryParams.append('search', search);
  }

  const response = await authenticatedRequest(
    getApiUrl(`/api/admin/visitors?${queryParams.toString()}`),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch visitors' }));
    throw new Error(error.error || 'Failed to fetch visitors');
  }

  return await response.json();
}

/**
 * Get visitor statistics
 */
export async function getVisitorStats(): Promise<VisitorStats> {
  const response = await authenticatedRequest(
    getApiUrl('/api/admin/visitors/stats'),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch visitor stats' }));
    throw new Error(error.error || 'Failed to fetch visitor stats');
  }

  const data: VisitorStatsResponse = await response.json();
  return data.stats;
}

