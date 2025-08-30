import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList, Location, ChatPin } from '../types/app';
import { useLocation } from '../hooks/useLocation';
import { useAuth } from '../hooks/useAuth';
import { getOrCreateAnonymousUser } from '../services/anonymousUser';
import { getNearbyChatsGroups, ChatGroup } from '../services/chatGroups';
import { joinChat, trackChatVisit } from '../services/userParticipation';
import MapComponent from '../components/MapComponent';

type MapNavigationProp = StackNavigationProp<RootStackParamList>;

type ViewMode = 'map' | 'activity';

const MapScreen: React.FC = () => {
  const navigation = useNavigation<MapNavigationProp>();
  const { location, hasPermission, requestPermission, isLoading: locationLoading } = useLocation();
  const { isAuthenticated } = useAuth();
  const [anonymousName, setAnonymousName] = useState<string>('');
  const [chatPins, setChatPins] = useState<ChatPin[]>([]);
  const [nearbyGroups, setNearbyGroups] = useState<ChatGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  console.log('🗺️ MapScreen state:', { 
    hasPermission, 
    location: location ? 'Available' : 'Loading...', 
    isAuthenticated,
    anonymousName 
  });

  useEffect(() => {
    const initializeAnonymousUser = async () => {
      console.log('🎭 MapScreen: Initializing anonymous user...');
      try {
        const startTime = Date.now();
        const anonymousUser = await getOrCreateAnonymousUser();
        const endTime = Date.now();
        
        console.log('✅ MapScreen: Anonymous user initialized:', {
          name: anonymousUser.generated_name,
          deviceId: anonymousUser.device_id,
          timeTaken: `${endTime - startTime}ms`,
          isExisting: !!anonymousUser.last_seen
        });
        
        setAnonymousName(anonymousUser.generated_name);
        
        // Test persistence by logging current state
        console.log('🔍 MapScreen: Anonymous user state summary:', {
          displayName: anonymousUser.generated_name,
          persistenceCheck: 'Will be validated on next app restart'
        });
      } catch (error) {
        console.error('❌ MapScreen: Failed to initialize anonymous user:', error);
        setAnonymousName('Unknown User');
      }
    };

    initializeAnonymousUser();
  }, []);

  // Fetch nearby chat groups when location is available (with debouncing)
  const lastFetchLocationRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  
  useEffect(() => {
    if (location) {
      const currentTime = Date.now();
      
      // Debounce group fetching - only fetch if location changed significantly or enough time passed
      const shouldFetch = !lastFetchLocationRef.current || 
        Math.abs(lastFetchLocationRef.current.lat - location.latitude) > 0.001 ||
        Math.abs(lastFetchLocationRef.current.lng - location.longitude) > 0.001 ||
        (currentTime - lastFetchLocationRef.current.time) > 30000; // 30 seconds minimum
      
      if (shouldFetch) {
        const fetchNearbyGroups = async () => {
          console.log('🔍 Fetching nearby chat groups for location:', location);
          setLoadingGroups(true);
          
          try {
            const groups = await getNearbyChatsGroups(location, 5); // 5km radius
            setNearbyGroups(groups);
            
            lastFetchLocationRef.current = {
              lat: location.latitude,
              lng: location.longitude,
              time: currentTime
            };
            
            // Convert groups to ChatPin format for map display
            const pins: ChatPin[] = groups.map(group => ({
              id: group.id,
              coordinate: {
                latitude: group.lat,
                longitude: group.lng,
              },
              title: group.name,
              memberCount: group.member_count || 0,
              description: group.description,
              distance: group.distance ? `${group.distance.toFixed(1)}km away` : undefined,
            }));
            
            setChatPins(pins);
            console.log(`✅ Loaded ${pins.length} nearby chat groups on map`);
          } catch (error) {
            console.error('❌ Failed to fetch nearby groups:', error);
            // Fallback to empty array
            setChatPins([]);
          } finally {
            setLoadingGroups(false);
          }
        };

        fetchNearbyGroups();
      }
    }
  }, [location]);

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

  const handlePinPress = (pin: ChatPin) => {
    console.log('📍 Chat pin pressed:', pin);
    
    const group = nearbyGroups.find(g => g.id === pin.id);
    
    Alert.alert(
      `Join "${pin.title}"?`,
      `${pin.description || 'Local chat group'}\n\n👥 ${pin.memberCount} members${pin.distance ? ` • ${pin.distance}` : ''}\n\nYou'll join as: ${anonymousName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: '🚪 Join Chat', 
          style: 'default',
          onPress: () => handleJoinChat(group || pin) 
        },
      ]
    );
  };

  const handleJoinChat = async (chatData: ChatGroup | ChatPin) => {
    const chatName = ('title' in chatData) ? chatData.title : chatData.name;
    console.log('🚪 Joining chat:', chatName);
    
    try {
      // Track the join action
      await joinChat(chatData.id, chatName);
      await trackChatVisit(chatData.id, chatName);
      
      Alert.alert(
        '🎉 Joined Successfully!', 
        `Welcome to "${chatName}"!\n\nYou can now see this chat in your Chats tab. Chat functionality is coming soon. You'll be able to:\n• Send messages\n• Share polls\n• Connect with nearby people\n\nStay tuned! 🚀`,
        [{ text: 'Got it!', style: 'default' }]
      );
      
      // Future: Navigate to chat room
      // navigation.navigate('ChatRoom', { groupId: chatData.id });
      
    } catch (error) {
      console.error('❌ Failed to join chat:', error);
      Alert.alert('Error', 'Failed to join chat. Please try again.');
    }
  };

  const renderDiscoveryHeader = () => (
    <View style={styles.discoveryHeader}>
      <View style={styles.headerTop}>
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>Discover</Text>
          <Text style={styles.locationSubtitle}>
            {location 
              ? `${nearbyGroups.length} chats nearby`
              : hasPermission ? 'Getting location...' : 'Location needed'
            }
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.createButton} 
          onPress={handleCreateChat}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
          onPress={() => setViewMode('map')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
            🌍 Map
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'activity' && styles.toggleButtonActive]}
          onPress={() => setViewMode('activity')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, viewMode === 'activity' && styles.toggleTextActive]}>
            ⚡ Activity
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActivityView = () => (
    <View style={styles.activityView}>
      {loadingGroups ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Finding nearby chats...</Text>
        </View>
      ) : nearbyGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No chats nearby</Text>
          <Text style={styles.emptyText}>
            Be the first to start a conversation in this area!
          </Text>
          <TouchableOpacity style={styles.createFirstButton} onPress={handleCreateChat}>
            <Text style={styles.createFirstButtonText}>Create First Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.chatList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatListContent}
        >
          {nearbyGroups.map((group, index) => (
            <TouchableOpacity
              key={group.id}
              style={styles.chatCard}
              onPress={() => handlePinPress({
                id: group.id,
                coordinate: { latitude: group.lat, longitude: group.lng },
                title: group.name,
                description: group.description,
                memberCount: group.member_count || 0,
                distance: group.distance ? `${group.distance.toFixed(1)}km away` : undefined,
              })}
              activeOpacity={0.8}
            >
              <View style={styles.chatCardHeader}>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatTitle}>{group.name}</Text>
                  <Text style={styles.chatDescription} numberOfLines={2}>
                    {group.description}
                  </Text>
                </View>
                <View style={styles.chatStats}>
                  <Text style={styles.memberCount}>
                    👥 {group.member_count || Math.floor(Math.random() * 20) + 5}
                  </Text>
                  {group.distance && (
                    <Text style={styles.distance}>
                      📍 {group.distance.toFixed(1)}km
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.chatCardFooter}>
                <Text style={styles.lastActivity}>
                  Last active: {new Date(group.last_activity).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <View style={styles.joinButton}>
                  <Text style={styles.joinButtonText}>Join</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NexU</Text>
          <Text style={styles.headerSubtitle}>📍 Location Access Required</Text>
        </View>
        
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Location Permission Needed</Text>
          <Text style={styles.permissionText}>
            NexU needs access to your location to discover nearby chat groups and connect you with local conversations.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderDiscoveryHeader()}
      
      <View style={styles.content}>
        {viewMode === 'map' ? (
          <View style={styles.mapViewContainer}>
            <MapComponent
              location={location}
              chatPins={chatPins}
              onPinPress={handlePinPress}
            />
            
            {/* Status overlay for map */}
            {loadingGroups && (
              <View style={styles.mapStatusOverlay}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Finding chats...</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          renderActivityView()
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  
  // Discovery Header Styles
  discoveryHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#19323C',
    marginBottom: 2,
  },
  locationSubtitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  createButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FF7E67',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(255, 126, 103, 0.3)',
    elevation: 4,
  },
  createButtonIcon: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // View Toggle Styles
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  toggleTextActive: {
    color: '#19323C',
  },
  
  // Content Container
  content: {
    flex: 1,
  },
  
  // Map View Styles
  mapViewContainer: {
    flex: 1,
    position: 'relative',
  },
  mapStatusOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#19323C',
  },
  
  // Activity View Styles
  activityView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#19323C',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createFirstButton: {
    backgroundColor: '#FF7E67',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  createFirstButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Chat List Styles
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: 16,
    paddingBottom: 32, // Extra padding at bottom for better scrolling
  },
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.06)',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  chatCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chatInfo: {
    flex: 1,
    marginRight: 16,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#19323C',
    marginBottom: 4,
  },
  chatDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
  chatStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#85DCBA',
  },
  distance: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '500',
  },
  chatCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  lastActivity: {
    fontSize: 12,
    color: '#999999',
  },
  joinButton: {
    backgroundColor: '#FF7E67',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Permission Screen Styles
  header: {
    backgroundColor: '#19323C',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF5E5',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFF5E5',
    opacity: 0.8,
    marginTop: 2,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#FAFAFA',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#19323C',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#FF7E67',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(255, 126, 103, 0.3)',
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MapScreen;
