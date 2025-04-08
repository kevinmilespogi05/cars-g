export interface ChatRoom {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_direct_message: boolean;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

export interface ChatParticipant {
  room_id: string;
  user_id: string;
  joined_at: string;
} 