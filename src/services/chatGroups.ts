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
export const getNearbyChatsGroups = async (
  userLocation: Location,
  radiusKm: number = 5
): Promise<ChatGroup[]> => {
  console.log('🔍 Fetching nearby chat groups...', {
    userLocation,
    radiusKm
  });

  try {
    // Query all active chat groups first
    // TODO: Optimize with H3 grid-based spatial queries for better performance
    const { data: chatGroups, error } = await supabase
      .from('chat_groups')
      .select('*')
      .eq('is_active', true)
      .order('last_activity', { ascending: false });

    if (error) {
      console.error('❌ Error fetching chat groups:', error);
      throw error;
    }

    if (!chatGroups || chatGroups.length === 0) {
      console.log('📭 No chat groups found');
      return [];
    }

    console.log(`📋 Found ${chatGroups.length} total chat groups, filtering by distance...`);

    // Filter by distance and add distance/member count info
    const nearbyChatGroups = chatGroups
      .map(group => {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          group.lat,
          group.lng
        );
        
        return {
          ...group,
          distance,
          member_count: Math.floor(Math.random() * 50) + 1, // TODO: Replace with real member count query
        };
      })
      .filter(group => group.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance); // Sort by closest first

    console.log(`✅ Found ${nearbyChatGroups.length} nearby chat groups within ${radiusKm}km`, 
      nearbyChatGroups.map(g => ({ name: g.name, distance: g.distance.toFixed(2) + 'km' }))
    );

    return nearbyChatGroups;
  } catch (error) {
    console.error('❌ Failed to fetch nearby chat groups:', error);
    return [];
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
