import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  ListRenderItem,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList, Message } from '../types/app';
import { useAuth } from '../hooks/useAuth';
import { useRealTimeMessages } from '../hooks/useRealTimeMessages';
import { sendMessage } from '../services/chatMessages';
import { hasJoinedChat } from '../services/userParticipation';
import { getOrCreateAnonymousUser } from '../services/anonymousUser';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ChatScreen: React.FC = () => {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const route = useRoute<ChatScreenRouteProp>();
  const { isAuthenticated, user } = useAuth();
  
  const { chatGroupId, chatName, memberCount } = route.params;
  
  // State
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  
  // Real-time messages hook
  const {
    messages,
    isLoading: messagesLoading,
    error: messagesError,
    addOptimisticMessage,
    removeOptimisticMessage,
    replaceOptimisticMessage,
  } = useRealTimeMessages(chatGroupId);
  
  // FlatList ref for auto-scrolling
  const flatListRef = useRef<FlatList>(null);

  console.log('💬 ChatScreen mounted:', { 
    chatGroupId, 
    chatName, 
    memberCount,
    isAuthenticated,
    messagesCount: messages.length
  });

  // Check authorization on mount
  useEffect(() => {
    const checkAuthorization = async () => {
      console.log('🔐 ChatScreen: Checking authorization...');
      setIsCheckingAuth(true);
      
      try {
        const hasJoined = await hasJoinedChat(chatGroupId);
        
        if (!hasJoined) {
          console.error('❌ User not authorized for chat:', chatGroupId);
          Alert.alert(
            'Access Denied',
            'You need to join this chat from the Discovery page first.',
            [
              { 
                text: 'Go to Discovery', 
                onPress: () => navigation.navigate('Main') 
              }
            ]
          );
          return;
        }
        
        console.log('✅ User authorized for chat');
        setIsAuthorized(true);
        
        // Get current user info
        if (isAuthenticated && user) {
          setCurrentUserId(user.id);
          setCurrentUserName(user.display_name);
        } else {
          const anonymousUser = await getOrCreateAnonymousUser();
          setCurrentUserId(anonymousUser.id);
          setCurrentUserName(anonymousUser.generated_name);
        }
        
      } catch (error) {
        console.error('❌ Failed to check authorization:', error);
        Alert.alert(
          'Error',
          'Failed to verify chat access. Please try again.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuthorization();
  }, [chatGroupId, isAuthenticated, user, navigation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Small delay to ensure FlatList has rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string) => {
    if (!isAuthorized || !currentUserId) {
      throw new Error('Not authorized to send messages');
    }

    console.log('📤 ChatScreen: Sending message...');
    
    // Add optimistic message for instant feedback
    const tempId = addOptimisticMessage({
      content,
      sender_type: isAuthenticated ? 'user' : 'anonymous',
      user_id: isAuthenticated ? currentUserId : null,
      anonymous_user_id: isAuthenticated ? null : currentUserId,
      display_name: currentUserName,
      avatar_color: null, // Will be generated in the service
    });

    try {
      const result = await sendMessage({
        chatGroupId,
        content,
        senderType: isAuthenticated ? 'user' : 'anonymous',
        userId: isAuthenticated ? currentUserId : undefined,
        userDisplayName: isAuthenticated ? currentUserName : undefined,
      });

      if (result.success && result.message) {
        console.log('✅ Message sent successfully');
        replaceOptimisticMessage(tempId, result.message);
      } else {
        console.error('❌ Failed to send message:', result.error);
        removeOptimisticMessage(tempId);
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('❌ Send message error:', error);
      removeOptimisticMessage(tempId);
      throw error;
    }
  }, [
    isAuthorized,
    currentUserId,
    currentUserName,
    isAuthenticated,
    chatGroupId,
    addOptimisticMessage,
    removeOptimisticMessage,
    replaceOptimisticMessage,
  ]);

  // Render message item
  const renderMessage: ListRenderItem<Message> = ({ item, index }) => {
    const isOwn = isAuthenticated 
      ? item.user_id === currentUserId
      : item.anonymous_user_id === currentUserId;
    
    // Show avatar for first message in a group or different sender
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !previousMessage || 
      (previousMessage.sender_type !== item.sender_type) ||
      (item.sender_type === 'user' && previousMessage.user_id !== item.user_id) ||
      (item.sender_type === 'anonymous' && previousMessage.anonymous_user_id !== item.anonymous_user_id);

    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        showAvatar={showAvatar}
        isOptimistic={item.id.startsWith('temp_')}
      />
    );
  };

  // Loading state
  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7E67" />
          <Text style={styles.loadingText}>Checking access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not authorized state
  if (!isAuthorized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Access Denied</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>🚫</Text>
          <Text style={styles.errorText}>You need to join this chat first</Text>
          <TouchableOpacity 
            style={styles.errorButton} 
            onPress={() => navigation.navigate('Main')}
          >
            <Text style={styles.errorButtonText}>Go to Discovery</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
          {memberCount && (
            <Text style={styles.headerSubtitle}>👥 {memberCount} people</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.userIndicator}>{currentUserName}</Text>
        </View>
      </View>

      {/* Messages list */}
      <View style={styles.messagesContainer}>
        {messagesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF7E67" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messagesError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{messagesError}</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Be the first to start the conversation!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              // Auto-scroll to bottom when content changes
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            getItemLayout={(data, index) => ({
              length: 80, // Approximate message height
              offset: 80 * index,
              index,
            })}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}
      </View>

      {/* Message input */}
      <MessageInput 
        onSend={handleSendMessage}
        disabled={!isAuthorized || messagesLoading}
        placeholder="Type a message..."
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E5',
  },
  header: {
    backgroundColor: '#19323C',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    fontSize: 16,
    color: '#85DCBA',
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF5E5',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFF5E5',
    opacity: 0.8,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  userIndicator: {
    fontSize: 12,
    color: '#85DCBA',
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#19323C',
    marginTop: 16,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#19323C',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  errorButton: {
    backgroundColor: '#FF7E67',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  errorButtonText: {
    color: '#FFF5E5',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#19323C',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#19323C',
    opacity: 0.6,
    textAlign: 'center',
  },
});

export default ChatScreen;
