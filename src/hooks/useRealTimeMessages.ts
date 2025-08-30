import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { Message } from '../types/app';
import { hasJoinedChat } from '../services/userParticipation';

interface UseRealTimeMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  addOptimisticMessage: (message: Partial<Message>) => string;
  removeOptimisticMessage: (tempId: string) => void;
  replaceOptimisticMessage: (tempId: string, realMessage: Message) => void;
}

interface OptimisticMessage extends Message {
  isOptimistic?: boolean;
}

export const useRealTimeMessages = (chatGroupId: string): UseRealTimeMessagesReturn => {
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const isAuthorizedRef = useRef<boolean>(false);

  console.log('💬 useRealTimeMessages hook initialized for chat:', chatGroupId);

  // Validate message structure
  const validateMessage = useCallback((message: any): message is Message => {
    const required = ['id', 'chat_group_id', 'content', 'sent_at', 'sender_type', 'display_name'];
    const hasRequired = required.every(field => message[field] !== undefined && message[field] !== null);
    
    if (!hasRequired) {
      console.warn('❌ Invalid message structure:', message);
      return false;
    }
    
    if (!['user', 'anonymous'].includes(message.sender_type)) {
      console.warn('❌ Invalid sender_type:', message.sender_type);
      return false;
    }
    
    return true;
  }, []);

  // Check authorization and setup subscription
  useEffect(() => {
    if (!chatGroupId) {
      console.warn('⚠️ No chatGroupId provided to useRealTimeMessages');
      setIsLoading(false);
      return;
    }

    const initializeChat = async () => {
      console.log('🔐 Checking chat authorization for:', chatGroupId);
      
      try {
        // Check if user has joined this chat
        const hasJoined = await hasJoinedChat(chatGroupId);
        
        if (!hasJoined) {
          console.error('❌ User not authorized for chat:', chatGroupId);
          setError('You must join this chat before viewing messages');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ User authorized for chat:', chatGroupId);
        isAuthorizedRef.current = true;
        
        // Load initial messages
        await loadInitialMessages();
        
        // Setup real-time subscription
        setupRealTimeSubscription();
        
      } catch (err) {
        console.error('❌ Failed to initialize chat:', err);
        setError('Failed to load chat messages');
        setIsLoading(false);
      }
    };

    initializeChat();

    // Cleanup subscription on unmount or chatGroupId change
    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up real-time subscription for chat:', chatGroupId);
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [chatGroupId]);

  // Load initial messages from database
  const loadInitialMessages = async () => {
    console.log('📥 Loading initial messages for chat:', chatGroupId);
    setIsLoading(true);
    
    try {
      // Use current_messages view for 24-hour TTL
      const { data, error } = await supabase
        .from('current_messages')
        .select('*')
        .eq('chat_group_id', chatGroupId)
        .order('sent_at', { ascending: true })
        .limit(100); // Load last 100 messages
      
      if (error) {
        console.error('❌ Failed to load initial messages:', error);
        throw error;
      }
      
      const validMessages = (data || []).filter(validateMessage);
      console.log(`✅ Loaded ${validMessages.length} initial messages`);
      
      setMessages(validMessages);
      setError(null);
      
    } catch (err: any) {
      console.error('❌ Error loading initial messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup real-time subscription
  const setupRealTimeSubscription = () => {
    if (!isAuthorizedRef.current) {
      console.warn('⚠️ Cannot setup subscription - user not authorized');
      return;
    }

    console.log('🔄 Setting up real-time subscription for chat:', chatGroupId);
    
    subscriptionRef.current = supabase
      .channel(`chat:${chatGroupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_group_id=eq.${chatGroupId}`
      }, (payload) => {
        console.log('📨 Received real-time message:', payload);
        
        const newMessage = payload.new;
        
        if (validateMessage(newMessage)) {
          console.log('✅ Adding real-time message to state');
          setMessages(prev => {
            // Avoid duplicates (in case optimistic update already exists)
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) {
              console.log('🔄 Replacing optimistic message with real message');
              return prev.map(msg => 
                msg.id === newMessage.id ? { ...newMessage, isOptimistic: false } : msg
              );
            } else {
              console.log('➕ Adding new real-time message');
              return [...prev, { ...newMessage, isOptimistic: false }];
            }
          });
        } else {
          console.warn('⚠️ Received invalid real-time message, ignoring');
        }
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for chat:', chatGroupId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error for chat:', chatGroupId);
          setError('Real-time connection lost');
        }
      });
  };

  // Add optimistic message (for instant UI feedback)
  const addOptimisticMessage = useCallback((messageData: Partial<Message>): string => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      chat_group_id: chatGroupId,
      content: messageData.content || '',
      sent_at: new Date().toISOString(),
      sender_type: messageData.sender_type || 'anonymous',
      user_id: messageData.user_id || null,
      anonymous_user_id: messageData.anonymous_user_id || null,
      display_name: messageData.display_name || 'Unknown',
      avatar_color: messageData.avatar_color || '#666',
      message_type: 'text',
      poll_data: null,
      isOptimistic: true,
    };
    
    console.log('⚡ Adding optimistic message:', tempId);
    setMessages(prev => [...prev, optimisticMessage]);
    
    return tempId;
  }, [chatGroupId]);

  // Remove optimistic message (on send failure)
  const removeOptimisticMessage = useCallback((tempId: string) => {
    console.log('❌ Removing optimistic message:', tempId);
    setMessages(prev => prev.filter(msg => msg.id !== tempId));
  }, []);

  // Replace optimistic message with real one (on successful send)
  const replaceOptimisticMessage = useCallback((tempId: string, realMessage: Message) => {
    console.log('🔄 Replacing optimistic message with real:', { tempId, realId: realMessage.id });
    setMessages(prev => prev.map(msg => 
      msg.id === tempId ? { ...realMessage, isOptimistic: false } : msg
    ));
  }, []);

  // Placeholder send function (will be implemented in chat service)
  const sendMessage = useCallback(async (content: string) => {
    throw new Error('sendMessage should be implemented by chat service');
  }, []);

  return {
    messages: messages.filter(msg => !msg.isOptimistic || msg.isOptimistic), // Include all messages
    isLoading,
    error,
    sendMessage,
    addOptimisticMessage,
    removeOptimisticMessage,
    replaceOptimisticMessage,
  };
};
