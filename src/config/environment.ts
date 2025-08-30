// Helper function to parse boolean environment variables
const parseBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper function to parse number environment variables
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const CONFIG = {
  // Core Supabase Configuration
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  
  // App Configuration
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'NexU',
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  DEBUG_MODE: parseBoolean(process.env.EXPO_PUBLIC_DEBUG_MODE, false),
  
  // Location & Geospatial Settings
  H3_RESOLUTION: parseNumber(process.env.EXPO_PUBLIC_H3_RESOLUTION, 8),
  LOCATION_UPDATE_INTERVAL: parseNumber(process.env.EXPO_PUBLIC_LOCATION_UPDATE_INTERVAL, 10000),
  LOCATION_DISTANCE_FILTER: parseNumber(process.env.EXPO_PUBLIC_LOCATION_DISTANCE_FILTER, 50),
  
  // Chat Configuration
  MESSAGE_RETENTION_HOURS: parseNumber(process.env.EXPO_PUBLIC_MESSAGE_RETENTION_HOURS, 24),
  MAX_GROUP_CREATION_LIMIT: parseNumber(process.env.EXPO_PUBLIC_MAX_GROUP_CREATION_LIMIT, 3),
  RATE_LIMIT_MESSAGES_PER_MINUTE: parseNumber(process.env.EXPO_PUBLIC_RATE_LIMIT_MESSAGES_PER_MINUTE, 10),
  MAX_MESSAGE_LENGTH: parseNumber(process.env.EXPO_PUBLIC_MAX_MESSAGE_LENGTH, 1000),
  
  // Realtime Settings
  REALTIME_ENABLED: parseBoolean(process.env.EXPO_PUBLIC_REALTIME_ENABLED, true),
  REALTIME_HEARTBEAT_INTERVAL: parseNumber(process.env.EXPO_PUBLIC_REALTIME_HEARTBEAT_INTERVAL, 30000),
  
  // Feature Flags
  ENABLE_ANONYMOUS_CHATS: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_ANONYMOUS_CHATS, true),
  ENABLE_POLLS: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_POLLS, true),
  ENABLE_LOCATION_SHARING: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_LOCATION_SHARING, true),
  ENABLE_MAP_VIEW: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_MAP_VIEW, true),
  ENABLE_CHAT_HISTORY: parseBoolean(process.env.EXPO_PUBLIC_ENABLE_CHAT_HISTORY, true),
  
  // Security Settings
  ANONYMOUS_USER_TTL_DAYS: parseNumber(process.env.EXPO_PUBLIC_ANONYMOUS_USER_TTL_DAYS, 14),
  SESSION_TIMEOUT_MINUTES: parseNumber(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES, 60),
  
  // Map Configuration
  MAP_DEFAULT_ZOOM: parseNumber(process.env.EXPO_PUBLIC_MAP_DEFAULT_ZOOM, 15),
  MAP_MAX_PINS: parseNumber(process.env.EXPO_PUBLIC_MAP_MAX_PINS, 50),
  DISCOVERY_RADIUS_KM: parseNumber(process.env.EXPO_PUBLIC_DISCOVERY_RADIUS_KM, 2),
  
  // Development Settings
  LOG_LEVEL: process.env.EXPO_PUBLIC_LOG_LEVEL || 'debug',
  MOCK_LOCATION: parseBoolean(process.env.EXPO_PUBLIC_MOCK_LOCATION, false),
  MOCK_CHATS: parseBoolean(process.env.EXPO_PUBLIC_MOCK_CHATS, true),
} as const;

export const validateConfig = () => {
  const errors: string[] = [];
  
  // Required configuration
  if (!CONFIG.SUPABASE_URL) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is required');
  }
  if (!CONFIG.SUPABASE_ANON_KEY) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  
  // Validation for numeric values
  if (CONFIG.H3_RESOLUTION < 1 || CONFIG.H3_RESOLUTION > 15) {
    errors.push('EXPO_PUBLIC_H3_RESOLUTION must be between 1 and 15');
  }
  if (CONFIG.MESSAGE_RETENTION_HOURS < 1) {
    errors.push('EXPO_PUBLIC_MESSAGE_RETENTION_HOURS must be greater than 0');
  }
  if (CONFIG.RATE_LIMIT_MESSAGES_PER_MINUTE < 1) {
    errors.push('EXPO_PUBLIC_RATE_LIMIT_MESSAGES_PER_MINUTE must be greater than 0');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
  
  if (CONFIG.DEBUG_MODE) {
    console.log('🔧 NexU Configuration:', {
      APP_NAME: CONFIG.APP_NAME,
      APP_VERSION: CONFIG.APP_VERSION,
      SUPABASE_URL: CONFIG.SUPABASE_URL,
      H3_RESOLUTION: CONFIG.H3_RESOLUTION,
      MOCK_CHATS: CONFIG.MOCK_CHATS,
      ENABLE_ANONYMOUS_CHATS: CONFIG.ENABLE_ANONYMOUS_CHATS,
    });
  }
};
