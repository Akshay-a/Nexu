import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList, Location, ChatPin } from '../types/app';
import { useLocation } from '../hooks/useLocation';
import { useAuth } from '../hooks/useAuth';
import { getOrCreateAnonymousUser } from '../services/anonymousUser';
import MapComponent from '../components/MapComponent';

type MapNavigationProp = StackNavigationProp<RootStackParamList>;

const MapScreen: React.FC = () => {
  const navigation = useNavigation<MapNavigationProp>();
  const { location, hasPermission, requestPermission, isLoading: locationLoading } = useLocation();
  const { isAuthenticated } = useAuth();
  const [anonymousName, setAnonymousName] = useState<string>('');
  const [chatPins, setChatPins] = useState<ChatPin[]>([]);

  console.log('🗺️ MapScreen state:', { 
    hasPermission, 
    location: location ? 'Available' : 'Loading...', 
    isAuthenticated,
    anonymousName 
  });

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
    if (location) {
      const mockPins: ChatPin[] = [
        {
          id: '1',
          coordinate: {
            latitude: location.latitude + 0.001,
            longitude: location.longitude + 0.001,
          },
          title: 'Library Study Group',
          memberCount: 23,
        },
        {
          id: '2',
          coordinate: {
            latitude: location.latitude - 0.001,
            longitude: location.longitude + 0.002,
          },
          title: 'Campus Events',
          memberCount: 67,
        },
        {
          id: '3',
          coordinate: {
            latitude: location.latitude + 0.002,
            longitude: location.longitude - 0.001,
          },
          title: 'Lost & Found',
          memberCount: 8,
        },
      ];
      setChatPins(mockPins);
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
    Alert.alert(
      pin.title,
      `${pin.memberCount} people • Tap to join chat`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join Chat', onPress: () => Alert.alert('Coming Soon', 'Chat rooms will be available soon!') },
      ]
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
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>NexU</Text>
          <Text style={styles.headerSubtitle}>
            📍 {location ? 'Location Found' : 'Finding Location...'}
          </Text>
        </View>
        <View style={styles.userIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.userName}>{anonymousName}</Text>
        </View>
      </View>

      {location && (
        <View style={styles.notification}>
          <Text style={styles.notificationText}>
            🎯 Found {chatPins.length} active chats nearby
          </Text>
        </View>
      )}

      <View style={styles.mapContainer}>
        <MapComponent
          location={location}
          chatPins={chatPins}
          onPinPress={handlePinPress}
        />
      </View>

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
  notification: {
    backgroundColor: '#FDE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#FF7E67',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 8,
  },
  notificationText: {
    fontSize: 14,
    color: '#19323C',
  },
  mapContainer: {
    flex: 1,
    margin: 0,
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#19323C',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#19323C',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#FF7E67',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF5E5',
  },
});

export default MapScreen;
