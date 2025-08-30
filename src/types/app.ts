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
