import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { supabase } from '../services/supabase';
import { User, AuthState } from '../types/app';
import { getCurrentUser } from '../services/auth';

const ONBOARDING_KEY = 'nexu_has_seen_onboarding';

const getHasSeenOnboarding = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } else {
    const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return value === 'true';
  }
};

const setHasSeenOnboarding = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } else {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  }
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      console.log('🔄 Starting auth initialization...');
      
      try {
        // Step 1: Check onboarding status (local storage only)
        console.log('📋 Checking onboarding status...');
        const seenOnboarding = await getHasSeenOnboarding();
        console.log('📋 Has seen onboarding:', seenOnboarding);
        
        if (!isMounted) return;
        setHasSeenOnboardingState(seenOnboarding);

        // Step 2: Quick auth check
        console.log('👤 Checking auth status...');
        let user = null;
        try {
          user = await getCurrentUser();
          console.log('👤 Auth check result:', user ? 'Authenticated' : 'Anonymous');
        } catch (userError) {
          console.log('ℹ️ No authenticated user - proceeding as anonymous');
        }

        if (!isMounted) return;
        setAuthState({
          isAuthenticated: !!user,
          isLoading: false,
          user,
        });
        
        console.log('✅ Auth initialization complete - Loading: false');
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        if (!isMounted) return;
        
        // Always set loading to false so app can continue
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
        setHasSeenOnboardingState(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            const user = await getCurrentUser();
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              user,
            });
          } catch (error) {
            console.error('Failed to get user profile:', error);
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
            });
          }
        } else {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
          });
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const completeOnboarding = async () => {
    await setHasSeenOnboarding();
    setHasSeenOnboardingState(true);
  };

  return {
    ...authState,
    hasSeenOnboarding,
    completeOnboarding,
  };
};
