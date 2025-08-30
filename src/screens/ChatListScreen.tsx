import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '../types/app';
import { useAuth } from '../hooks/useAuth';
import { getOrCreateAnonymousUser } from '../services/anonymousUser';

type ChatListNavigationProp = StackNavigationProp<RootStackParamList>;

interface ChatItem {
  id: string;
  title: string;
  lastMessage: string;
  memberCount: number;
  distance: string;
  timeAgo: string;
  status: 'live' | 'active' | 'quiet';
}

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListNavigationProp>();
  const { isAuthenticated } = useAuth();
  const [anonymousName, setAnonymousName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<ChatItem[]>([]);

  useEffect(() => {
    const initializeAnonymousUser = async () => {
      try {
        const anonymousUser = await getOrCreateAnonymousUser();
        setAnonymousName(anonymousUser.generated_name);
      } catch (error) {
        console.error('Failed to initialize anonymous user:', error);
      }
    };

    initializeAnonymousUser();
  }, []);

  useEffect(() => {
    const mockChats: ChatItem[] = [
      {
        id: '1',
        title: 'Library Study Group',
        lastMessage: 'Anyone got notes for CS101? Need help with the assignment...',
        memberCount: 23,
        distance: '150m away',
        timeAgo: '2 min ago',
        status: 'live',
      },
      {
        id: '2',
        title: 'Campus Events',
        lastMessage: 'Concert tonight at the quad! Who\'s going?',
        memberCount: 67,
        distance: '300m away',
        timeAgo: '5 min ago',
        status: 'active',
      },
      {
        id: '3',
        title: 'Lost & Found',
        lastMessage: 'Found AirPods near the library entrance',
        memberCount: 8,
        distance: '200m away',
        timeAgo: '12 min ago',
        status: 'active',
      },
      {
        id: '4',
        title: 'Cafeteria Chat',
        lastMessage: 'What\'s good on the menu today?',
        memberCount: 12,
        distance: '80m away',
        timeAgo: '25 min ago',
        status: 'quiet',
      },
    ];
    setChats(mockChats);
  }, []);

  const handleCreateChat = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign Up Required',
        'You need to sign up to create chats. You can still join existing chats anonymously.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => navigation.navigate('Auth') },
        ]
      );
      return;
    }
    
    Alert.alert('Coming Soon', 'Chat creation will be available soon!');
  };

  const handleChatPress = (chat: ChatItem) => {
    Alert.alert('Coming Soon', 'Chat rooms will be available soon!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return '#FF7E67';
      case 'active': return '#85DCBA';
      case 'quiet': return '#19323C';
      default: return '#19323C';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return '🔴 Live';
      case 'active': return '🟢 Active';
      case 'quiet': return '💤 Quiet';
      default: return '';
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Recent Activity</Text>
          <Text style={styles.headerSubtitle}>📍 University Campus</Text>
        </View>
        <View style={styles.userIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.userName}>{anonymousName}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search nearby chats..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#19323C"
        />
      </View>

      <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatItem}
              onPress={() => handleChatPress(chat)}
            >
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>{chat.title}</Text>
                <View style={styles.chatMeta}>
                  <Text style={styles.timeAgo}>{chat.timeAgo}</Text>
                  <Text style={[styles.status, { color: getStatusColor(chat.status) }]}>
                    {getStatusText(chat.status)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.lastMessage} numberOfLines={2}>
                {chat.lastMessage}
              </Text>
              
              <View style={styles.chatStats}>
                <Text style={styles.memberCount}>👥 {chat.memberCount} people</Text>
                <Text style={styles.distance}>📍 {chat.distance}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💬</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No chats match your search' : 'No active chats nearby'}
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.createButton} onPress={handleCreateChat}>
        <Text style={styles.createButtonText}>+</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF5E5',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFF5E5',
    opacity: 0.8,
  },
  userIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: '#85DCBA',
    borderRadius: 4,
  },
  userName: {
    fontSize: 12,
    color: '#FFF5E5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C9F5D3',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#19323C',
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  chatItem: {
    backgroundColor: '#C9F5D3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#19323C',
    flex: 1,
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  timeAgo: {
    fontSize: 11,
    color: '#19323C',
    opacity: 0.7,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#19323C',
    opacity: 0.8,
    marginBottom: 8,
    lineHeight: 20,
  },
  chatStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberCount: {
    fontSize: 12,
    color: '#19323C',
    opacity: 0.6,
  },
  distance: {
    fontSize: 12,
    color: '#19323C',
    opacity: 0.6,
  },
  createButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: '#FF7E67',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF7E67',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  createButtonText: {
    fontSize: 24,
    color: '#FFF5E5',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#19323C',
    opacity: 0.6,
    textAlign: 'center',
  },
});

export default ChatListScreen;
