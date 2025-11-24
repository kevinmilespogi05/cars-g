import { getApiUrl } from '../lib/config';

const VISITOR_ID_KEY = 'cars_g_visitor_id';
const VISIT_TRACKED_KEY = 'cars_g_visit_tracked';
const VISIT_TRACK_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a unique visitor identifier using browser fingerprinting
 */
export function generateVisitorId(): string {
  // Check if we already have a visitor ID stored
  const storedId = localStorage.getItem(VISITOR_ID_KEY);
  if (storedId) {
    return storedId;
  }

  // Generate a new visitor ID using browser fingerprinting
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0,
  ].join('|');

  // Create a simple hash from the fingerprint
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate a unique ID combining timestamp and hash
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const visitorId = `visitor_${Math.abs(hash)}_${timestamp}_${random}`;

  // Store the visitor ID
  localStorage.setItem(VISITOR_ID_KEY, visitorId);

  return visitorId;
}

/**
 * Get the current visitor ID
 */
export function getVisitorId(): string | null {
  return localStorage.getItem(VISITOR_ID_KEY);
}

/**
 * Check if the current visit has already been tracked
 */
export function hasVisitBeenTracked(): boolean {
  const tracked = localStorage.getItem(VISIT_TRACKED_KEY);
  if (!tracked) return false;

  const trackedTime = parseInt(tracked, 10);
  const now = Date.now();
  
  // If more than 24 hours have passed, allow tracking again
  if (now - trackedTime > VISIT_TRACK_EXPIRY) {
    localStorage.removeItem(VISIT_TRACKED_KEY);
    return false;
  }

  return true;
}

/**
 * Mark the current visit as tracked
 */
export function markVisitAsTracked(): void {
  localStorage.setItem(VISIT_TRACKED_KEY, Date.now().toString());
}

/**
 * Track a unique visitor
 */
export async function trackVisitor(userId?: string): Promise<{ isNewVisitor: boolean; totalUniqueVisitors: number }> {
  const visitorId = generateVisitorId();
  
  // Check if we've already tracked this session
  if (hasVisitBeenTracked()) {
    // Still return the count, but don't increment
    const count = await getVisitorCount();
    return { isNewVisitor: false, totalUniqueVisitors: count };
  }

  try {
    const response = await fetch(getApiUrl('/api/visits/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitorId,
        // Optionally include IP hash and user agent for additional tracking
        userAgent: navigator.userAgent,
        userId: userId || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      // Mark as tracked
      markVisitAsTracked();
      return {
        isNewVisitor: data.isNewVisitor,
        totalUniqueVisitors: data.totalUniqueVisitors,
      };
    } else {
      throw new Error(data.error || 'Failed to track visitor');
    }
  } catch (error) {
    console.error('Error tracking visitor:', error);
    // Return cached count if available, or 0
    const count = await getVisitorCount().catch(() => 0);
    return { isNewVisitor: false, totalUniqueVisitors: count };
  }
}

/**
 * Link current visitor to authenticated user
 */
export async function linkVisitorToUser(userId: string): Promise<void> {
  const visitorId = getVisitorId();
  
  if (!visitorId) {
    console.warn('No visitor ID found, cannot link to user');
    return;
  }

  try {
    const { authenticatedRequest } = await import('../lib/jwt');
    const response = await authenticatedRequest(getApiUrl('/api/visits/link-user'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitorId,
        userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to link visitor' }));
      throw new Error(error.error || 'Failed to link visitor to user');
    }
  } catch (error) {
    console.error('Error linking visitor to user:', error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Get visitor statistics (for admin use)
 */
export async function getVisitorStats(): Promise<{
  totalVisitors: number;
  anonymousVisitors: number;
  authenticatedVisitors: number;
  newVisitorsToday: number;
  newVisitorsThisWeek: number;
  newVisitorsThisMonth: number;
  dailyTrends: Record<string, number>;
}> {
  try {
    const { authenticatedRequest } = await import('../lib/jwt');
    const response = await authenticatedRequest(getApiUrl('/api/admin/visitors/stats'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch stats' }));
      throw new Error(error.error || 'Failed to get visitor stats');
    }

    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Error getting visitor stats:', error);
    throw error;
  }
}

/**
 * Get the current unique visitor count
 */
export async function getVisitorCount(): Promise<number> {
  try {
    const response = await fetch(getApiUrl('/api/visits/count'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.totalUniqueVisitors || 0;
    } else {
      throw new Error(data.error || 'Failed to get visitor count');
    }
  } catch (error) {
    console.error('Error getting visitor count:', error);
    throw error;
  }
}

