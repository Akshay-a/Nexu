import { supabase } from './supabase';
import { getOrCreateAnonymousUser, generateAvatarColor } from './anonymousUser';
import { hasJoinedChat } from './userParticipation';
import { Message } from '../types/app';

export interface SendMessageParams {
  chatGroupId: string;
  content: string;
  senderType: 'user' | 'anonymous';
  userId?: string;
  userDisplayName?: string;
}

export interface SendMessageResult {
  success: boolean;
  message?: Message;
  error?: string;
}

/**
 * Send a message to a chat group with proper authorization and rate limiting
 */
export const sendMessage = async (params: SendMessageParams): Promise<SendMessageResult> => {
  const { chatGroupId, content, senderType, userId, userDisplayName } = params;
  
  console.log('📤 Sending message:', { 
    chatGroupId, 
    contentLength: content.length, 
    senderType,
    userId: userId ? 'provided' : 'not provided'
  });

  try {
    // Validate input
    if (!content.trim()) {
      return { success: false, error: 'Message cannot be empty' };
    }
    
    if (content.length > 1000) {
      return { success: false, error: 'Message too long (max 1000 characters)' };
    }

    // Verify user is authorized to send messages in this chat
    console.log('🔐 Checking chat authorization...');
    const hasJoined = await hasJoinedChat(chatGroupId);
    if (!hasJoined) {
      console.error('❌ User not authorized for chat:', chatGroupId);
      return { success: false, error: 'You must join this chat before sending messages' };
    }

    // Get user information based on sender type
    let senderId: string;
    let displayName: string;
    let avatarColor: string;
    
    if (senderType === 'user' && userId && userDisplayName) {
      senderId = userId;
      displayName = userDisplayName;
      avatarColor = generateAvatarColor(userId);
    } else {
      // Anonymous user
      console.log('🎭 Getting anonymous user info...');
      const anonymousUser = await getOrCreateAnonymousUser();
      senderId = anonymousUser.id;
      displayName = anonymousUser.generated_name;
      avatarColor = generateAvatarColor(anonymousUser.id);
    }

    console.log('👤 Sender info:', { senderId, displayName, senderType });

    // Check rate limiting
    console.log('⏱️ Checking rate limiting...');
    const { data: canSend, error: rateLimitError } = await supabase.rpc('check_message_rate_limit', {
      sender_id: senderId,
      sender_type_param: senderType
    });

    if (rateLimitError) {
      console.error('❌ Rate limit check failed:', rateLimitError);
      return { success: false, error: 'Rate limit check failed' };
    }

    if (!canSend) {
      console.warn('⚠️ Rate limit exceeded for user:', senderId);
      return { success: false, error: 'Rate limit exceeded. Please wait before sending another message.' };
    }

    // Prepare message data
    const messageData = {
      chat_group_id: chatGroupId,
      content: content.trim(),
      sender_type: senderType,
      user_id: senderType === 'user' ? senderId : null,
      anonymous_user_id: senderType === 'anonymous' ? senderId : null,
      display_name: displayName,
      avatar_color: avatarColor,
      message_type: 'text',
      poll_data: null,
    };

    console.log('💾 Inserting message to database...');
    
    // Insert message into database
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to insert message:', error);
      
      // Handle specific error cases
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'Duplicate message detected' };
      } else if (error.code === '23503') { // Foreign key violation
        return { success: false, error: 'Invalid chat or user reference' };
      } else if (error.message.includes('rate limit')) {
        return { success: false, error: 'Rate limit exceeded' };
      }
      
      return { success: false, error: 'Failed to send message' };
    }

    console.log('✅ Message sent successfully:', { 
      messageId: data.id, 
      sentAt: data.sent_at 
    });

    return { 
      success: true, 
      message: data as Message 
    };

  } catch (error: any) {
    console.error('❌ Unexpected error sending message:', error);
    return { 
      success: false, 
      error: error.message || 'Unexpected error occurred' 
    };
  }
};

/**
 * Get recent messages for a chat (with pagination support)
 */
export const getRecentMessages = async (
  chatGroupId: string, 
  limit: number = 50,
  beforeTimestamp?: string
): Promise<Message[]> => {
  console.log('📥 Loading recent messages:', { chatGroupId, limit, beforeTimestamp });

  try {
    // Verify user is authorized to view messages in this chat
    const hasJoined = await hasJoinedChat(chatGroupId);
    if (!hasJoined) {
      console.error('❌ User not authorized to view messages in chat:', chatGroupId);
      return [];
    }

    let query = supabase
      .from('current_messages') // Use view for 24-hour TTL
      .select('*')
      .eq('chat_group_id', chatGroupId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    // Add pagination if beforeTimestamp provided
    if (beforeTimestamp) {
      query = query.lt('sent_at', beforeTimestamp);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to load messages:', error);
      return [];
    }

    const messages = (data || []).reverse(); // Reverse to get chronological order
    console.log(`✅ Loaded ${messages.length} messages`);

    return messages as Message[];

  } catch (error) {
    console.error('❌ Unexpected error loading messages:', error);
    return [];
  }
};

/**
 * Get message count for a chat (for UI display)
 */
export const getMessageCount = async (chatGroupId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('current_messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_group_id', chatGroupId);

    if (error) {
      console.error('❌ Failed to get message count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('❌ Unexpected error getting message count:', error);
    return 0;
  }
};

/**
 * Check if a chat has recent activity (for UI indicators)
 */
export const hasRecentActivity = async (chatGroupId: string): Promise<boolean> => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('current_messages')
      .select('id')
      .eq('chat_group_id', chatGroupId)
      .gte('sent_at', fiveMinutesAgo)
      .limit(1);

    if (error) {
      console.error('❌ Failed to check recent activity:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('❌ Unexpected error checking recent activity:', error);
    return false;
  }
};
