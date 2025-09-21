import { getAccessToken } from '../lib/jwt';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export interface AdminStatus {
  success: boolean;
  isOnline: boolean;
  adminCount: number;
}

export const checkAdminStatus = async (): Promise<AdminStatus> => {
  try {
    const token = getAccessToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/status`, {
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
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return {
      success: false,
      isOnline: false,
      adminCount: 0
    };
  }
};
