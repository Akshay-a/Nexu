import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '../types/app';
import { useAuth } from '../hooks/useAuth';

type OnboardingNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const { completeOnboarding } = useAuth();

  const handleStartExploring = async () => {
    console.log('🌍 Start Exploring clicked');
    try {
      await completeOnboarding();
      console.log('✅ Onboarding completed, navigating to Main');
      navigation.replace('Main');
    } catch (error) {
      console.error('❌ Failed to complete onboarding:', error);
    }
  };

  const handleSignUp = async () => {
    console.log('👤 Sign Up clicked');
    try {
      await completeOnboarding();
      console.log('✅ Onboarding completed, navigating to Auth');
      navigation.navigate('Auth');
    } catch (error) {
      console.error('❌ Failed to complete onboarding:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.title}>NexU</Text>
          <Text style={styles.subtitle}>
            Discover conversations happening right around you. Join anonymously or create your own local chat groups.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartExploring}>
            <Text style={styles.primaryButtonText}>🌍 Start Exploring</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSignUp}>
            <Text style={styles.secondaryButtonText}>👤 Sign Up to Create Chats</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logo: {
    width: 120,
    height: 120,
    backgroundColor: '#FF7E67',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#FF7E67',
    shadowOffset: { width: 0, height: 12 },
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
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#19323C',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#FF7E67',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#FF7E67',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF5E5',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#85DCBA',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#19323C',
  },
});

export default OnboardingScreen;
