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
    let initializationTimeout: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      console.log('🔄 Starting auth initialization...');
      
      try {
        // Setting timeout to prevent infinite loading and make user experience easy
        initializationTimeout = setTimeout(() => {
          if (isMounted) {
            console.warn('⚠️ Auth initialization timeout - forcing completion');
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
            });
            setHasSeenOnboardingState(false);
          }
        }, 3000); // 3 second timeout - should be faster now
        
        // Step 1: Check onboarding status (local storage only)
        console.log('📋 Checking onboarding status...');
        const seenOnboarding = await getHasSeenOnboarding();
        console.log('📋 Has seen onboarding:', seenOnboarding);
        
        if (!isMounted) return;
        setHasSeenOnboardingState(seenOnboarding);

        // Step 2: Quick auth check - optimize for first-time users
        console.log('👤 Checking auth status...');
        let user = null;
        
        try {
          // Quick session check first - this is much faster than getCurrentUser()
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.log('ℹ️ Session check error:', sessionError.message, '- proceeding as anonymous');
          } else if (!session?.user) {
            console.log('ℹ️ No active session found - proceeding as anonymous (first-time user)');
          } else {
            console.log('👤 Active session found, fetching user profile...');
            // Only call getCurrentUser if we actually have a session
            const userPromise = getCurrentUser();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
            );
            
            user = await Promise.race([userPromise, timeoutPromise]) as User | null;
            console.log('👤 Profile fetch result:', user ? 'Success' : 'Failed');
          }
        } catch (userError) {
          const errorMessage = userError instanceof Error ? userError.message : 'Unknown error';
          console.log('ℹ️ Auth check failed:', errorMessage, '- proceeding as anonymous');
        }

        if (!isMounted) return;
        
        // Clear timeout on successful completion
        clearTimeout(initializationTimeout);
        
        setAuthState({
          isAuthenticated: !!user,
          isLoading: false,
          user,
        });
        
        console.log('✅ Auth initialization complete - Loading: false, Authenticated:', !!user);
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        if (!isMounted) return;
        
        // Clear timeout on error
        if (initializationTimeout) clearTimeout(initializationTimeout);
        
        // Always set loading to false so app can continue
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
        setHasSeenOnboardingState(false);
        console.log('✅ Auth initialization fallback complete - Loading: false');
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, !!session?.user);
        
        if (!isMounted) return;
        
        if (session?.user) {
          try {
            const user = await getCurrentUser();
            if (isMounted) {
              setAuthState({
                isAuthenticated: true,
                isLoading: false,
                user,
              });
              console.log('✅ Auth state updated - Authenticated');
            }
          } catch (error) {
            console.error('Failed to get user profile:', error);
            if (isMounted) {
              setAuthState({
                isAuthenticated: false,
                isLoading: false,
                user: null,
              });
              console.log('✅ Auth state updated - Failed to get profile');
            }
          }
        } else {
          if (isMounted) {
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
            });
            console.log('✅ Auth state updated - Anonymous');
          }
        }
      }
    );

    return () => {
      isMounted = false;
      if (initializationTimeout) clearTimeout(initializationTimeout);
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
