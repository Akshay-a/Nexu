export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  created_groups_count?: number;
}

export interface ChatGroup {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  lat: number;
  lng: number;
  h3_index_8: string;
  created_at: string;
  last_activity: string;
  is_active: boolean;
}

export interface AnonymousUser {
  id: string;
  device_id: string;
  generated_name: string;
  created_at: string;
  last_seen: string;
}

export interface Message {
  id: string;
  chat_group_id: string;
  content: string;
  sent_at: string;
  sender_type: 'user' | 'anonymous';
  user_id?: string;
  anonymous_user_id?: string;
  display_name: string;
  avatar_color?: string;
  message_type?: 'text' | 'poll';
  poll_data?: PollData;
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface PollVote {
  id: string;
  message_id: string;
  option_id: string;
  voter_type: 'user' | 'anonymous';
  user_id?: string;
  anonymous_user_id?: string;
  voted_at: string;
}
