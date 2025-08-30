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
  console.log('🚪 [JOIN CHAT SERVICE START] joinChat called:', {
    chatId,
    chatName,
    timestamp: new Date().toISOString()
  });

  try {
    console.log('📚 [JOIN CHAT SERVICE] Loading existing joined chats from AsyncStorage...');
    const joinedChats = await getJoinedChats();
    console.log('📚 [JOIN CHAT SERVICE] Loaded joined chats:', {
      count: joinedChats.length,
      chats: joinedChats.map(c => ({ id: c.id, name: c.name, isActive: c.isActive }))
    });

    // Check if already joined
    const existing = joinedChats.find(chat => chat.id === chatId);
    console.log('🔍 [JOIN CHAT SERVICE] Checking if already joined:', {
      chatId,
      alreadyJoined: !!existing,
      existingData: existing ? {
        name: existing.name,
        joinedAt: existing.joinedAt,
        lastActivity: existing.lastActivity,
        isActive: existing.isActive
      } : null
    });

    if (existing) {
      // Update last activity
      console.log('🔄 [JOIN CHAT SERVICE] Updating existing chat activity...');
      existing.lastActivity = new Date().toISOString();
      existing.isActive = true;
      console.log('✅ [JOIN CHAT SERVICE] Updated existing chat:', {
        chatId,
        name: existing.name,
        newLastActivity: existing.lastActivity
      });
    } else {
      // Add new chat
      console.log('➕ [JOIN CHAT SERVICE] Adding new chat to joined list...');
      const newChatEntry = {
        id: chatId,
        name: chatName,
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true,
      };
      joinedChats.push(newChatEntry);
      console.log('✅ [JOIN CHAT SERVICE] Added new chat:', newChatEntry);
    }

    console.log('💾 [JOIN CHAT SERVICE] Saving updated joined chats to AsyncStorage...');
    await AsyncStorage.setItem(JOINED_CHATS_KEY, JSON.stringify(joinedChats));
    console.log('✅ [JOIN CHAT SERVICE SUCCESS] User joined chat:', {
      chatId,
      chatName,
      totalJoinedChats: joinedChats.length,
      updatedChats: joinedChats.map(c => ({ id: c.id, name: c.name, isActive: c.isActive }))
    });
  } catch (error) {
    console.error('❌ [JOIN CHAT SERVICE FAILED] Failed to join chat:', {
      chatId,
      chatName,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
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
  console.log('👁️ [TRACK VISIT START] trackChatVisit called:', {
    chatId,
    chatName,
    timestamp: new Date().toISOString()
  });

  try {
    console.log('📚 [TRACK VISIT] Loading existing visited chats from AsyncStorage...');
    const stored = await AsyncStorage.getItem(VISITED_CHATS_KEY);
    const visited = stored ? JSON.parse(stored) : {};

    console.log('📊 [TRACK VISIT] Current visit data:', {
      totalChats: Object.keys(visited).length,
      existingVisit: visited[chatId] ? {
        name: visited[chatId].name,
        lastVisited: visited[chatId].lastVisited,
        visitCount: visited[chatId].visitCount
      } : null
    });

    const newVisitCount = (visited[chatId]?.visitCount || 0) + 1;
    visited[chatId] = {
      name: chatName,
      lastVisited: new Date().toISOString(),
      visitCount: newVisitCount,
    };

    console.log('🔄 [TRACK VISIT] Updated visit data:', {
      chatId,
      name: chatName,
      lastVisited: visited[chatId].lastVisited,
      newVisitCount,
      previousVisitCount: visited[chatId].visitCount - 1
    });

    console.log('💾 [TRACK VISIT] Saving updated visit data to AsyncStorage...');
    await AsyncStorage.setItem(VISITED_CHATS_KEY, JSON.stringify(visited));
    console.log('✅ [TRACK VISIT SUCCESS] Chat visit tracked:', {
      chatId,
      chatName,
      visitCount: newVisitCount,
      totalVisitedChats: Object.keys(visited).length
    });
  } catch (error) {
    console.error('❌ [TRACK VISIT FAILED] Failed to track chat visit:', {
      chatId,
      chatName,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
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
