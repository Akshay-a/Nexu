import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { Location as LocationType } from '../types/app';
import { CONFIG } from '../config/environment';

export const requestLocationPermission = async (): Promise<boolean> => {
  console.log('📍 Requesting location permission...');
  
  if (Platform.OS === 'web') {
    console.log('🌐 Web platform detected');
    
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported by this browser');
      return false;
    }
    
    console.log('🔍 Testing geolocation access...');
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location permission granted on web');
          console.log('📍 Test position:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          resolve(true);
        },
        (error) => {
          console.error('❌ Location permission denied on web:', error.message);
          console.log('🔍 Error details:', {
            code: error.code,
            message: error.message
          });
          resolve(false);
        },
        {
          timeout: 10000,
          maximumAge: 0,
          enableHighAccuracy: false
        }
      );
    });
  }
  
  console.log('📱 Native platform detected, requesting permission...');
  const { status } = await Location.requestForegroundPermissionsAsync();
  const granted = status === 'granted';
  console.log('📍 Native permission result:', granted ? 'GRANTED' : 'DENIED');
  return granted;
};

export const getCurrentLocation = async (): Promise<LocationType | null> => {
  console.log('🗺️ Getting current location...');
  
  if (Platform.OS === 'web') {
    console.log('🌐 Using web geolocation API');
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('❌ Navigator geolocation not available');
        resolve(null);
        return;
      }
      
      console.log('🔍 Requesting current position...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          console.log('✅ Web location retrieved:', location);
          resolve(location);
        },
        (error) => {
          console.error('❌ Web location error:', error.message);
          console.log('🔍 Error details:', {
            code: error.code,
            message: error.message
          });
          resolve(null);
        },
        {
          timeout: 15000,
          maximumAge: 60000, // Cache for 1 minute
          enableHighAccuracy: true
        }
      );
    });
  }
  
  console.log('📱 Using native location API');
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    const result = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
    
    console.log('✅ Native location retrieved:', result);
    return result;
  } catch (error) {
    console.error('❌ Native location error:', error);
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
