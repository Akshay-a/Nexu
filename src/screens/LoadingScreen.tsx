import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import DebugPanel from '../components/DebugPanel';

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.title}>NexU</Text>
      </View>
      <ActivityIndicator size="large" color="#FF7E67" style={styles.spinner} />
      <DebugPanel />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    backgroundColor: '#FF7E67',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF7E67',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFF5E5',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#19323C',
  },
  spinner: {
    marginTop: 20,
  },
});

export default LoadingScreen;
