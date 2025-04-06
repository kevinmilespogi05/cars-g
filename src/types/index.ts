export interface User {
  id: string;
  email: string;
  points: number;
  rank: string;
  created_at: string;
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