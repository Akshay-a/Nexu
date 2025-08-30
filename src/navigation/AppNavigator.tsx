import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import { RootStackParamList } from '../types/app';
import OnboardingScreen from '../screens/OnboardingScreen';
import MainTabNavigator from './MainTabNavigator';
import AuthScreen from '../screens/AuthScreen';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, hasSeenOnboarding } = useAuth();
  const [forceShowApp, setForceShowApp] = useState(false);
  
  // Safety mechanism: if loading takes too long, force show the app
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Loading timeout reached, forcing app to show');
        setForceShowApp(true);
      }
    }, 5000); // 5 second timeout - reduced since auth is optimized
    
    return () => clearTimeout(timeout);
  }, [isLoading]);

  console.log('🧭 Navigator state:', {
    isAuthenticated: isAuthenticated,
    isLoading: isLoading,
    hasSeenOnboarding: hasSeenOnboarding,
    forceShowApp: forceShowApp
  });
  
  const shouldShowLoading = isLoading && !forceShowApp;
  const shouldShowOnboarding = !hasSeenOnboarding && (!isLoading || forceShowApp);
  const shouldShowMain = hasSeenOnboarding && (!isLoading || forceShowApp);
  
  console.log('🧭 Navigator decision:', {
    showLoading: shouldShowLoading,
    showOnboarding: shouldShowOnboarding,
    showMain: shouldShowMain
  });

  if (shouldShowLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {shouldShowOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="Auth" 
              component={AuthScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
