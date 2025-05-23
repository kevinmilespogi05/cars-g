export interface User {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string | null;
  points?: number;
  role?: string;
  created_at?: string;
  rank?: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  images?: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  points: number;
  rank: string;
}

export interface Activity {
  id: string;
  user_id: string;
  type: 'report_created' | 'report_resolved' | 'achievement_earned' | 'points_earned';
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  criteria: string;
  user_id: string;
  earned_at: string;
  progress?: number;
}