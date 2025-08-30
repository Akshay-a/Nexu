import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { Location as LocationType } from '../types/app';
import { CONFIG } from '../config/environment';

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(false);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false)
      );
    });
  }
  
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

export const getCurrentLocation = async (): Promise<LocationType | null> => {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => resolve(null)
      );
    });
  }
  
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.warn('Failed to get location:', error);
    return null;
  }
};

export const watchLocation = (callback: (location: LocationType | null) => void) => {
  if (Platform.OS === 'web') {
    if (!navigator.geolocation) {
      callback(null);
      return () => {};
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => callback(null)
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }
  
  let subscription: Location.LocationSubscription | null = null;
  
  Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: CONFIG.LOCATION_UPDATE_INTERVAL,
      distanceInterval: CONFIG.LOCATION_DISTANCE_FILTER,
    },
    (location) => {
      callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
    }
  ).then((sub) => {
    subscription = sub;
  }).catch(() => {
    callback(null);
  });
  
  return () => {
    if (subscription) {
      subscription.remove();
    }
  };
};
