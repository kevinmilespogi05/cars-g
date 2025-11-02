import { getAccessToken } from '../lib/jwt';
import { getApiUrl } from '../lib/config';

export interface AdminStatus {
  success: boolean;
  isOnline: boolean;
  adminCount: number;
}

export const checkAdminStatus = async (): Promise<AdminStatus> => {
  try {
    const token = getAccessToken();
    if (!token) {
      // Gracefully handle missing token - return default status
      console.warn('No authentication token available for admin status check');
      return {
        success: false,
        isOnline: false,
        adminCount: 0
      };
    }

    const response = await fetch(getApiUrl('/api/admin/status'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    // Gracefully handle all errors - don't throw, just return default
    console.warn('Failed to check admin status (non-fatal):', error.message || error);
    return {
      success: false,
      isOnline: false,
      adminCount: 0
    };
  }
};
