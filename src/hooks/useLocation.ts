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
      try {
        const permission = await requestLocationPermission();
        setHasPermission(permission);

        if (permission) {
          const currentLocation = await getCurrentLocation();
          setLocation(currentLocation);
        } else {
          setError('Location permission denied');
        }
      } catch (err) {
        setError('Failed to get location');
        console.error('Location error:', err);
      } finally {
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
    setIsLoading(true);
    try {
      const permission = await requestLocationPermission();
      setHasPermission(permission);
      
      if (permission) {
        const currentLocation = await getCurrentLocation();
        setLocation(currentLocation);
        setError(null);
      } else {
        setError('Location permission denied');
      }
    } catch (err) {
      setError('Failed to get location');
      console.error('Location error:', err);
    } finally {
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
