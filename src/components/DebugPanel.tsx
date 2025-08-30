import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { CONFIG } from '../config/environment';

const DebugPanel: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, hasSeenOnboarding } = useAuth();
  const { location, hasPermission, isLoading: locationLoading, error } = useLocation();

  if (!CONFIG.DEBUG_MODE) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Debug Panel</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auth State:</Text>
        <Text style={styles.item}>Loading: {authLoading ? '✅' : '❌'}</Text>
        <Text style={styles.item}>Authenticated: {isAuthenticated ? '✅' : '❌'}</Text>
        <Text style={styles.item}>Seen Onboarding: {hasSeenOnboarding ? '✅' : '❌'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location State:</Text>
        <Text style={styles.item}>Loading: {locationLoading ? '✅' : '❌'}</Text>
        <Text style={styles.item}>Permission: {hasPermission ? '✅' : '❌'}</Text>
        <Text style={styles.item}>Location: {location ? '✅' : '❌'}</Text>
        <Text style={styles.item}>Error: {error || 'None'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Config:</Text>
        <Text style={styles.item}>Supabase URL: {CONFIG.SUPABASE_URL ? '✅' : '❌'}</Text>
        <Text style={styles.item}>H3 Resolution: {CONFIG.H3_RESOLUTION}</Text>
        <Text style={styles.item}>Mock Chats: {CONFIG.MOCK_CHATS ? '✅' : '❌'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    maxWidth: 200,
    zIndex: 1000,
  },
  title: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#85DCBA',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  item: {
    color: '#FFF',
    fontSize: 10,
    marginBottom: 2,
  },
});

export default DebugPanel;
