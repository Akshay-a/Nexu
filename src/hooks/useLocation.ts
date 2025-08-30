import { useState, useEffect } from 'react';
import { Location } from '../types/app';
import { 
  requestLocationPermission, 
  getCurrentLocation, 
  watchLocation 
} from '../services/location';

export const useLocation = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeLocation = async () => {
      console.log('🗺️ Initializing location services...');
      
      try {
        console.log('🔐 Requesting location permission...');
        const permission = await requestLocationPermission();
        console.log('🔐 Permission result:', permission);
        setHasPermission(permission);

        if (permission) {
          console.log('✅ Permission granted, getting current location...');
          const currentLocation = await getCurrentLocation();
          console.log('📍 Current location result:', currentLocation);
          setLocation(currentLocation);
          
          if (currentLocation) {
            console.log('✅ Location initialized successfully');
            setError(null);
          } else {
            console.warn('⚠️ Location permission granted but failed to get coordinates');
            setError('Failed to get location coordinates');
          }
        } else {
          console.warn('⚠️ Location permission denied by user');
          setError('Location permission denied');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Location initialization error:', errorMessage);
        setError('Failed to get location');
      } finally {
        console.log('🏁 Location initialization complete');
        setIsLoading(false);
      }
    };

    initializeLocation();
  }, []);

  useEffect(() => {
    if (!hasPermission) return;

    const unsubscribe = watchLocation((newLocation) => {
      if (newLocation) {
        setLocation(newLocation);
        setError(null);
      } else {
        setError('Failed to get location updates');
      }
    });

    return unsubscribe;
  }, [hasPermission]);

  const requestPermission = async () => {
    console.log('🔄 Re-requesting location permission...');
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Requesting permission (retry)...');
      const permission = await requestLocationPermission();
      console.log('🔐 Permission result (retry):', permission);
      setHasPermission(permission);
      
      if (permission) {
        console.log('✅ Permission granted (retry), getting location...');
        const currentLocation = await getCurrentLocation();
        console.log('📍 Location result (retry):', currentLocation);
        setLocation(currentLocation);
        
        if (currentLocation) {
          console.log('✅ Location retry successful');
          setError(null);
        } else {
          console.warn('⚠️ Permission granted but location failed (retry)');
          setError('Failed to get location coordinates');
        }
      } else {
        console.warn('⚠️ Location permission denied (retry)');
        setError('Location permission denied');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Location retry error:', errorMessage);
      setError('Failed to get location');
    } finally {
      console.log('🏁 Location retry complete');
      setIsLoading(false);
    }
  };

  return {
    location,
    isLoading,
    hasPermission,
    error,
    requestPermission,
  };
};
