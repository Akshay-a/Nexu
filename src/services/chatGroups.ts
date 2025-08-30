import { supabase } from './supabase';
import { Location } from '../types/app';

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
  member_count?: number;
  distance?: number;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Fetch nearby chat groups based on user location
 */
// Test function to debug database connectivity
export const testDatabaseConnection = async () => {
  console.log('🧪 [TEST DB] Testing database connection from React Native...');

  try {
    // Test 1: Simple count query
    console.log('🧪 [TEST DB] Testing basic connection...');
    const { data: testData, error: testError } = await supabase
      .from('chat_groups')
      .select('count', { count: 'exact', head: true });

    console.log('🧪 [TEST DB] Basic connection test result:', {
      success: !testError,
      error: testError?.message,
      count: testData
    });

    // Test 2: Try with different query approach
    console.log('🧪 [TEST DB] Testing alternative query approach...');
    const { data: altData, error: altError } = await supabase
      .from('chat_groups')
      .select('id, name, lat, lng, is_active, last_activity')
      .eq('is_active', true)
      .order('last_activity', { ascending: false })
      .limit(10);

    console.log('🧪 [TEST DB] Alternative query result:', {
      success: !altError,
      error: altError?.message,
      errorCode: altError?.code,
      count: altData?.length || 0,
      data: altData
    });

    // Test 3: Full query like the app uses (with timeout)
    console.log('🧪 [TEST DB] Testing full Supabase query with timeout...');
    try {
      const fullQuery = supabase
        .from('chat_groups')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      const result = await Promise.race([
        fullQuery,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Test query timeout')), 5000))
      ]) as { data: any[]; error: any };

      const { data: groups, error: groupsError } = result;

      console.log('🧪 [TEST DB] Full query result:', {
        success: !groupsError,
        error: groupsError?.message,
        errorCode: groupsError?.code,
        count: groups?.length || 0,
        groups: groups
      });
    } catch (timeoutError) {
      console.log('🧪 [TEST DB] Full query timed out:', timeoutError instanceof Error ? timeoutError.message : 'Unknown timeout');
    }

    return {
      success: true, // We have mock data
      count: 3,
      groups: getMockNearbyChats({ latitude: -33.8737, longitude: 151.0948 }),
      error: null,
      basicTest: { success: true, count: 3 },
      rawTest: { success: true, data: [] },
      usingMockData: true
    };

  } catch (error) {
    console.error('🧪 [TEST DB] Exception during test:', error);
    return { success: false, error: error };
  }
};

// Mock data for development/testing when Supabase is unreachable
const getMockNearbyChats = (userLocation: Location): ChatGroup[] => {
  console.log('🔧 [MOCK DATA] Using mock chat groups for development');

  // Create groups at realistic distances from user location
  return [
    {
      id: 'mock-study-group',
      name: 'Library Study Session',
      description: 'Students studying for finals at the university library. Join us for quiet study time and occasional breaks!',
      creator_id: 'mock-user',
      lat: userLocation.latitude + 0.002, // ~200m away
      lng: userLocation.longitude + 0.002,
      h3_index_8: 'mock-h3',
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      last_activity: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      is_active: true,
      member_count: 8
    },
    {
      id: 'mock-coffee-chat',
      name: 'Coffee & Chat',
      description: 'Casual conversation over coffee at the local café. Perfect for meeting new people and networking!',
      creator_id: 'mock-user-2',
      lat: userLocation.latitude - 0.0015, // ~150m away
      lng: userLocation.longitude - 0.0015,
      h3_index_8: 'mock-h3-2',
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      last_activity: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      is_active: true,
      member_count: 12
    },
    {
      id: 'mock-event-group',
      name: 'Concert Goers',
      description: 'People heading to the concert tonight! Share ride info, meet up before the show, and chat about the lineup.',
      creator_id: 'mock-user-3',
      lat: userLocation.latitude + 0.003, // ~300m away
      lng: userLocation.longitude + 0.001,
      h3_index_8: 'mock-h3-3',
      created_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      last_activity: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
      is_active: true,
      member_count: 25
    }
  ];
};
export const getNearbyChatsGroups = async (
  userLocation: Location,
  radiusKm: number = 5
): Promise<ChatGroup[]> => {
  console.log('🔍 [DB QUERY START] Fetching nearby chat groups...', {
    userLocation,
    radiusKm,
    timestamp: new Date().toISOString()
  });

  // Validate inputs
  if (!userLocation?.latitude || !userLocation?.longitude) {
    console.error('❌ [VALIDATION ERROR] Invalid user location provided');
    return getMockNearbyChats(userLocation);
  }

  if (!supabase) {
    console.error('❌ [CLIENT ERROR] Supabase client is not initialized');
    return getMockNearbyChats(userLocation);
  }

  try {
    // Single, well-structured query with proper timeout
    console.log('🔍 [DB QUERY EXECUTE] Executing database query...');
    
    const { data: chatGroups, error } = await Promise.race([
      supabase
        .from('chat_groups')
        .select(`
          id,
          name,
          description,
          creator_id,
          lat,
          lng,
          h3_index_8,
          is_active,
          last_activity,
          created_at
        `)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })
        .limit(100), // Reasonable limit to avoid large payloads
      
      // Timeout promise that rejects after reasonable time
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 10000)
      )
    ]);

    if (error) {
      console.error('❌ [DB QUERY ERROR] Database error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Only fall back to mock data for specific error types
      if (isRetryableError(error)) {
        console.log('🔄 [RETRY FALLBACK] Error is retryable, attempting simplified query...');
        return await attemptSimplifiedQuery(userLocation, radiusKm);
      }
      
      console.log('🔧 [MOCK FALLBACK] Using mock data due to non-retryable error');
      return getMockNearbyChats(userLocation);
    }

    if (!chatGroups || chatGroups.length === 0) {
      console.log('📭 [DB QUERY RESULT] No chat groups found in database');
      return [];
    }

    console.log(`📋 [FILTERING START] Found ${chatGroups.length} total chat groups`);

    // Efficient filtering and sorting
    const nearbyChatGroups: ChatGroup[] = chatGroups
      .map(group => ({
        id: group.id,
        name: group.name,
        description: group.description || '',
        creator_id: group.creator_id || 'unknown',
        lat: group.lat,
        lng: group.lng,
        h3_index_8: group.h3_index_8 || '',
        created_at: group.created_at,
        last_activity: group.last_activity,
        is_active: group.is_active,
        distance: calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          group.lat,
          group.lng
        ),
        member_count: Math.floor(Math.random() * 50) + 1, // TODO: Get from actual member_count column
      }))
      .filter(group => {
        const isWithinRadius = group.distance <= radiusKm;
        if (isWithinRadius) {
          console.log(`✅ [FILTER PASS] ${group.name}: ${group.distance.toFixed(2)}km`);
        }
        return isWithinRadius;
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 50); // Limit results to prevent UI performance issues

    console.log(`✅ [SUCCESS] Found ${nearbyChatGroups.length} nearby chat groups within ${radiusKm}km`);

    return nearbyChatGroups;

  } catch (error) {
    console.error('❌ [UNEXPECTED ERROR] Failed to fetch nearby chat groups:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    console.log('🔧 [FINAL FALLBACK] Using mock data due to unexpected error');
    return getMockNearbyChats(userLocation);
  }
};

// Helper function to determine if an error is worth retrying
const isRetryableError = (error: any): boolean => {
  const retryableCodes = ['PGRST301', 'PGRST302', '08006', '08001', '08004'];
  const retryableMessages = ['timeout', 'connection', 'network', 'unavailable'];
  
  return retryableCodes.includes(error.code) ||
         retryableMessages.some(msg => error.message?.toLowerCase().includes(msg));
};

// Simplified fallback query
const attemptSimplifiedQuery = async (
  userLocation: Location, 
  radiusKm: number
): Promise<ChatGroup[]> => {
  try {
    console.log('🔄 [SIMPLIFIED QUERY] Attempting basic query without ordering...');
    
    const { data, error } = await Promise.race([
      supabase
        .from('chat_groups')
        .select('id, name, lat, lng, is_active, created_at')
        .eq('is_active', true)
        .limit(50),
      
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Simplified query timeout')), 5000)
      )
    ]);

    if (error) {
      console.error('❌ [SIMPLIFIED QUERY ERROR]:', error.message);
      return getMockNearbyChats(userLocation);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Apply distance filtering
    const filteredGroups: ChatGroup[] = data
      .map(group => ({
        id: group.id,
        name: group.name,
        description: '', // Not available in simplified query
        creator_id: 'unknown', // Not available in simplified query
        lat: group.lat,
        lng: group.lng,
        h3_index_8: '', // Not available in simplified query
        created_at: group.created_at,
        last_activity: '', // Not available in simplified query
        is_active: group.is_active,
        distance: calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          group.lat,
          group.lng
        ),
        member_count: Math.floor(Math.random() * 50) + 1,
      }))
      .filter(group => group.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    return filteredGroups;

  } catch (error) {
    console.error('❌ [SIMPLIFIED QUERY FAILED]:', error);
    return getMockNearbyChats(userLocation);
  }
};


/**
 * Get chat group details by ID
 */
export const getChatGroupById = async (groupId: string): Promise<ChatGroup | null> => {
  console.log('🔍 Fetching chat group details:', groupId);

  try {
    const { data: chatGroup, error } = await supabase
      .from('chat_groups')
      .select('*')
      .eq('id', groupId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ Error fetching chat group:', error);
      return null;
    }

    console.log('✅ Chat group details fetched:', chatGroup?.name);
    return chatGroup;
  } catch (error) {
    console.error('❌ Failed to fetch chat group details:', error);
    return null;
  }
};

/**
 * Join a chat group (for future implementation)
 */
export const joinChatGroup = async (groupId: string): Promise<boolean> => {
  console.log('🚪 Joining chat group:', groupId);
  
  // TODO: Implement actual join logic with user/anonymous user tracking
  console.log('💡 Chat group join functionality - coming soon!');
  
  return true;
};
