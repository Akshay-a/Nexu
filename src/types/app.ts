export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface DeviceInfo {
  deviceId: string;
  anonymousName: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Auth: undefined;
  Chat: {
    chatGroupId: string;
    chatName: string;
    memberCount?: number;
  };
};

export type MainTabParamList = {
  Map: undefined;
  ChatList: undefined;
};

export interface ChatPin {
  id: string;
  coordinate: Location;
  title: string;
  memberCount: number;
  description?: string;
  distance?: string;
}

export interface Message {
  id: string;
  chat_group_id: string;
  content: string;
  sent_at: string;
  sender_type: 'user' | 'anonymous';
  user_id: string | null;
  anonymous_user_id: string | null;
  display_name: string;
  avatar_color: string | null;
  message_type: 'text' | 'poll';
  poll_data: any | null;
}

export interface ChatMemberInfo {
  id: string;
  displayName: string;
  avatarColor: string;
  isOnline?: boolean;
  lastSeen?: string;
}
