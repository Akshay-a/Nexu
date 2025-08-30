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
import { getNearbyChatsGroups, ChatGroup, testDatabaseConnection } from '../services/chatGroups';
import { joinChat, trackChatVisit } from '../services/userParticipation';
import MapComponent from '../components/MapComponent';
import AsyncStorage from '@react-native-async-storage/async-storage';

type MapNavigationProp = StackNavigationProp<RootStackParamList>;

type ViewMode = 'map' | 'activity';

const NEARBY_GROUPS_CACHE_KEY = 'nexu_nearby_groups_cache';
const CACHE_EXPIRY_HOURS = 24;

const MapScreen: React.FC = () => {
  const navigation = useNavigation<MapNavigationProp>();
  const { location, hasPermission, requestPermission, isLoading: locationLoading } = useLocation();
  const { isAuthenticated } = useAuth();
  const [anonymousName, setAnonymousName] = useState<string>('');
  const [chatPins, setChatPins] = useState<ChatPin[]>([]);
  const [nearbyGroups, setNearbyGroups] = useState<ChatGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [joiningChatId, setJoiningChatId] = useState<string | null>(null);

  console.log('🗺️ MapScreen state:', {
    hasPermission,
    location: location ? 'Available' : 'Loading...',
    isAuthenticated,
    anonymousName
  });

  // Load cached groups on component mount
  useEffect(() => {
    const loadCachedGroups = async () => {
      try {
        const cached = await AsyncStorage.getItem(NEARBY_GROUPS_CACHE_KEY);
        if (cached) {
          const { groups, timestamp } = JSON.parse(cached);
          const cacheAge = Date.now() - timestamp;
          const maxAge = CACHE_EXPIRY_HOURS * 60 * 60 * 1000; // 24 hours in milliseconds

          if (cacheAge < maxAge && groups.length > 0) {
            console.log('📦 Loading cached nearby groups:', groups.length);
            setNearbyGroups(groups);

            // Convert to pins
            const pins: ChatPin[] = groups.map((group: ChatGroup) => ({
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
          } else {
            console.log('⏰ Cache expired, will fetch fresh data');
          }
        }
      } catch (error) {
        console.error('❌ Failed to load cached groups:', error);
      }
    };

    loadCachedGroups();
  }, []);

  useEffect(() => {
    const initializeAnonymousUser = async () => {
      console.log('🎭 [ANONYMOUS INIT START] MapScreen: Initializing anonymous user...');
      try {
        const startTime = Date.now();
        const anonymousUser = await getOrCreateAnonymousUser();
        const endTime = Date.now();

        console.log('✅ [ANONYMOUS INIT SUCCESS] Anonymous user initialized:', {
          name: anonymousUser.generated_name,
          deviceId: anonymousUser.device_id,
          timeTaken: `${endTime - startTime}ms`,
          isExisting: !!anonymousUser.last_seen,
          fullUserData: anonymousUser
        });

        setAnonymousName(anonymousUser.generated_name);

        // Test persistence by logging current state
        console.log('🔍 [ANONYMOUS STATE] Anonymous user state summary:', {
          displayName: anonymousUser.generated_name,
          deviceId: anonymousUser.device_id,
          persistenceCheck: 'Will be validated on next app restart'
        });
      } catch (error) {
        console.error('❌ [ANONYMOUS INIT FAILED] Failed to initialize anonymous user:', error);
        setAnonymousName('Unknown User');
      }
    };

    initializeAnonymousUser();
  }, []);

  // Fetch nearby chat groups when location is available (with improved debouncing)
  const lastFetchLocationRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to calculate if location change is significant (about 200 meters)
  const isSignificantLocationChange = (oldLoc: { lat: number; lng: number }, newLoc: Location): boolean => {
    const latDiff = Math.abs(oldLoc.lat - newLoc.latitude);
    const lngDiff = Math.abs(oldLoc.lng - newLoc.longitude);
    // Approximately 200 meters at equator
    const threshold = 0.0018; // ~200 meters
    return latDiff > threshold || lngDiff > threshold;
  };

  useEffect(() => {
    if (location) {
      const currentTime = Date.now();

      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Debounce with 2-second delay to avoid excessive API calls
      fetchTimeoutRef.current = setTimeout(() => {
        const shouldFetch = !lastFetchLocationRef.current ||
          isSignificantLocationChange(lastFetchLocationRef.current, location) ||
          (currentTime - lastFetchLocationRef.current.time) > 60000; // 1 minute minimum

        if (shouldFetch) {
          const fetchNearbyGroups = async () => {
            console.log('🔍 [UI FETCH START] Fetching nearby chat groups for location:', {
              location,
              timestamp: new Date().toISOString(),
              currentState: {
                nearbyGroupsCount: nearbyGroups.length,
                chatPinsCount: chatPins.length,
                loadingGroups
              }
            });
            setLoadingGroups(true);

            try {
                          console.log('🔍 [UI FETCH CALLING] About to call getNearbyChatsGroups...');
            const groups = await getNearbyChatsGroups(location, 5); // 5km radius
            console.log('🔍 [UI FETCH RECEIVED] Groups received from service:', {
              groupsCount: groups.length,
              groupsData: groups,
              groupsType: typeof groups,
              isArray: Array.isArray(groups)
            });

              setNearbyGroups(groups);

              lastFetchLocationRef.current = {
                lat: location.latitude,
                lng: location.longitude,
                time: currentTime
              };

              // Convert groups to ChatPin format for map display
              const pins: ChatPin[] = groups.map((group: ChatGroup) => ({
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

              console.log('📍 [UI PINS CREATED] Converting groups to map pins:', {
                groupsCount: groups.length,
                pinsCount: pins.length,
                pinsData: pins
              });

              setChatPins(pins);
              console.log(`✅ [UI STATE UPDATED] Loaded ${pins.length} nearby chat groups on map`, {
                nearbyGroups: groups,
                chatPins: pins,
                viewMode,
                loadingGroups: false
              });

              // Cache the groups for offline/persistence
              try {
                const cacheData = {
                  groups,
                  timestamp: Date.now(),
                  location: { latitude: location.latitude, longitude: location.longitude }
                };
                await AsyncStorage.setItem(NEARBY_GROUPS_CACHE_KEY, JSON.stringify(cacheData));
                console.log('💾 [CACHE SAVED] Cached nearby groups for offline access');
              } catch (cacheError) {
                console.error('❌ [CACHE FAILED] Failed to cache groups:', cacheError);
              }
            } catch (error) {
              console.error('❌ [UI FETCH FAILED] Failed to fetch nearby groups:', error);
              // Keep existing data on error to prevent disappearing chats
              if (nearbyGroups.length === 0) {
                setChatPins([]);
                console.log('🔄 [UI ERROR RECOVERY] Set chat pins to empty array due to error');
              } else {
                console.log('🔄 [UI ERROR RECOVERY] Keeping existing data:', {
                  nearbyGroupsCount: nearbyGroups.length,
                  chatPinsCount: chatPins.length
                });
              }
            } finally {
              setLoadingGroups(false);
              console.log('🏁 [UI FETCH COMPLETE] Fetch operation finished', {
                finalState: {
                  nearbyGroupsCount: nearbyGroups.length,
                  chatPinsCount: chatPins.length,
                  loadingGroups: false
                }
              });
            }
          };

          fetchNearbyGroups();
        } else {
          console.log('⏳ Skipping fetch - location change too small or too recent');
        }
      }, 2000); // 2 second debounce
    }

    // Cleanup timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
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
    const memberCount = 'memberCount' in chatData ? chatData.memberCount : undefined;
    console.log('🚪 [JOIN CHAT START] Joining chat:', {
      chatName,
      chatId: chatData.id,
      memberCount,
      anonymousName,
      joiningChatId,
      fullChatData: chatData
    });

    // Prevent multiple join attempts
    if (joiningChatId === chatData.id) {
      console.log('🚪 [JOIN CHAT SKIP] Already joining this chat, skipping');
      return;
    }

    setJoiningChatId(chatData.id);
    console.log('🚪 [JOIN CHAT STATE] Set joining state:', {
      joiningChatId: chatData.id,
      chatName
    });

    try {
      // Track the join action
      console.log('🚪 [JOIN CHAT STEP 1] Calling joinChat service...');
      await joinChat(chatData.id, chatName);
      console.log('🚪 [JOIN CHAT STEP 1 SUCCESS] joinChat completed');

      console.log('🚪 [JOIN CHAT STEP 2] Calling trackChatVisit service...');
      await trackChatVisit(chatData.id, chatName);
      console.log('🚪 [JOIN CHAT STEP 2 SUCCESS] trackChatVisit completed');

      console.log('✅ [JOIN CHAT SUCCESS] Successfully joined chat, preparing navigation', {
        chatId: chatData.id,
        chatName,
        memberCount,
        navigationParams: {
          chatGroupId: chatData.id,
          chatName: chatName,
          memberCount: memberCount
        }
      });

      // Small delay to show feedback before navigation
      setTimeout(() => {
        console.log('🚪 [JOIN CHAT NAVIGATE] Navigating to chat screen...');
        // Navigate directly to the chat screen
        navigation.navigate('Chat', {
          chatGroupId: chatData.id,
          chatName: chatName,
          memberCount: memberCount
        });
        setJoiningChatId(null);
        console.log('🚪 [JOIN CHAT COMPLETE] Navigation initiated, cleared joining state');
      }, 300);

    } catch (error) {
      console.error('❌ [JOIN CHAT FAILED] Failed to join chat:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        chatId: chatData.id,
        chatName
      });
      setJoiningChatId(null);
      console.log('🚪 [JOIN CHAT ERROR CLEANUP] Cleared joining state due to error');
      Alert.alert('Error', 'Failed to join chat. Please check your connection and try again.');
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

        {/* Temporary debug button */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: '#FF4444', marginLeft: 8 }]}
          onPress={async () => {
            console.log('🔧 [DEBUG] Testing database connection...');
            const result = await testDatabaseConnection();
            console.log('🔧 [DEBUG] Test result:', result);
            Alert.alert('Debug Result', `Success: ${result.success}\nCount: ${result.count || 0}`);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonIcon}>🔧</Text>
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

  const renderActivityView = () => {
    console.log('🎨 [UI RENDER ACTIVITY] Rendering activity view:', {
      loadingGroups,
      nearbyGroupsCount: nearbyGroups.length,
      chatPinsCount: chatPins.length,
      viewMode,
      anonymousName
    });

    return (
      <>
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
          {(() => {
            console.log('🎨 [UI RENDER CARDS] Rendering chat cards:', {
              groupsCount: nearbyGroups.length,
              groups: nearbyGroups.map(g => ({
                id: g.id,
                name: g.name,
                distance: g.distance?.toFixed(2) + 'km',
                memberCount: g.member_count
              }))
            });
            return null;
          })()}
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
                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    joiningChatId === group.id && styles.joinButtonLoading
                  ]}
                  onPress={() => handlePinPress({
                    id: group.id,
                    coordinate: { latitude: group.lat, longitude: group.lng },
                    title: group.name,
                    description: group.description,
                    memberCount: group.member_count || 0,
                    distance: group.distance ? `${group.distance.toFixed(1)}km away` : undefined,
                  })}
                  disabled={joiningChatId === group.id}
                >
                  <Text style={[
                    styles.joinButtonText,
                    joiningChatId === group.id && styles.joinButtonTextLoading
                  ]}>
                    {joiningChatId === group.id ? 'Joining...' : 'Join'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </>
  );
  };

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
      {(() => {
        console.log('🎨 [UI RENDER MAIN] Main render cycle:', {
          hasPermission,
          location: location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'No location',
          isAuthenticated,
          anonymousName,
          nearbyGroupsCount: nearbyGroups.length,
          chatPinsCount: chatPins.length,
          loadingGroups,
          viewMode,
          joiningChatId
        });
        return null;
      })()}
      {renderDiscoveryHeader()}

      <View style={styles.content}>
        {/* Map View - Always mounted but shown/hidden with display style */}
        <View style={[
          styles.mapViewContainer, 
          { display: viewMode === 'map' ? 'flex' : 'none' }
        ]}>
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
        
        {/* Activity View - Always mounted but shown/hidden with display style */}
        <View style={[
          styles.activityView, 
          { display: viewMode === 'activity' ? 'flex' : 'none' }
        ]}>
          {renderActivityView()}
        </View>
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
  joinButtonLoading: {
    backgroundColor: '#CCCCCC',
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  joinButtonTextLoading: {
    color: '#666666',
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
