import AsyncStorage from '@react-native-async-storage/async-storage';

const JOINED_CHATS_KEY = 'nexu_joined_chats';
const VISITED_CHATS_KEY = 'nexu_visited_chats';

export interface JoinedChat {
  id: string;
  name: string;
  joinedAt: string;
  lastActivity: string;
  isActive: boolean;
}

/**
 * Get list of chats the user has explicitly joined
 */
export const getJoinedChats = async (): Promise<JoinedChat[]> => {
  try {
    const stored = await AsyncStorage.getItem(JOINED_CHATS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Failed to get joined chats:', error);
    return [];
  }
};

/**
 * Add a chat to the user's joined chats list
 */
export const joinChat = async (chatId: string, chatName: string): Promise<void> => {
  try {
    const joinedChats = await getJoinedChats();
    
    // Check if already joined
    const existing = joinedChats.find(chat => chat.id === chatId);
    if (existing) {
      // Update last activity
      existing.lastActivity = new Date().toISOString();
      existing.isActive = true;
    } else {
      // Add new chat
      joinedChats.push({
        id: chatId,
        name: chatName,
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true,
      });
    }
    
    await AsyncStorage.setItem(JOINED_CHATS_KEY, JSON.stringify(joinedChats));
    console.log('✅ User joined chat:', chatName);
  } catch (error) {
    console.error('❌ Failed to join chat:', error);
    throw error;
  }
};

/**
 * Leave a chat (mark as inactive)
 */
export const leaveChat = async (chatId: string): Promise<void> => {
  try {
    const joinedChats = await getJoinedChats();
    const chat = joinedChats.find(c => c.id === chatId);
    
    if (chat) {
      chat.isActive = false;
      chat.lastActivity = new Date().toISOString();
      await AsyncStorage.setItem(JOINED_CHATS_KEY, JSON.stringify(joinedChats));
      console.log('✅ User left chat:', chat.name);
    }
  } catch (error) {
    console.error('❌ Failed to leave chat:', error);
    throw error;
  }
};

/**
 * Check if user has joined a specific chat
 */
export const hasJoinedChat = async (chatId: string): Promise<boolean> => {
  try {
    const joinedChats = await getJoinedChats();
    return joinedChats.some(chat => chat.id === chatId && chat.isActive);
  } catch (error) {
    console.error('❌ Failed to check chat membership:', error);
    return false;
  }
};

/**
 * Get active joined chats (for Chat List screen)
 */
export const getActiveJoinedChats = async (): Promise<JoinedChat[]> => {
  try {
    const allJoined = await getJoinedChats();
    return allJoined.filter(chat => chat.isActive);
  } catch (error) {
    console.error('❌ Failed to get active joined chats:', error);
    return [];
  }
};

/**
 * Track chat visits (for analytics/UX purposes)
 */
export const trackChatVisit = async (chatId: string, chatName: string): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(VISITED_CHATS_KEY);
    const visited = stored ? JSON.parse(stored) : {};
    
    visited[chatId] = {
      name: chatName,
      lastVisited: new Date().toISOString(),
      visitCount: (visited[chatId]?.visitCount || 0) + 1,
    };
    
    await AsyncStorage.setItem(VISITED_CHATS_KEY, JSON.stringify(visited));
  } catch (error) {
    console.error('❌ Failed to track chat visit:', error);
  }
};

/**
 * Clear all participation data (for testing/reset)
 */
export const clearParticipationData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([JOINED_CHATS_KEY, VISITED_CHATS_KEY]);
    console.log('✅ Cleared all participation data');
  } catch (error) {
    console.error('❌ Failed to clear participation data:', error);
  }
};
