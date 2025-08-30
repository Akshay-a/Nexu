import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase, setDeviceContext } from './supabase';
import { AnonymousUser } from '../types/database';

const DEVICE_ID_KEY = 'nexu_device_id';

const colors = [
  'Crimson', 'Azure', 'Emerald', 'Golden', 'Violet', 'Scarlet', 'Turquoise', 
  'Silver', 'Amber', 'Coral', 'Navy', 'Rose', 'Jade', 'Copper', 'Pearl'
];

const animals = [
  'Fox', 'Wolf', 'Bear', 'Eagle', 'Tiger', 'Lion', 'Deer', 'Hawk', 
  'Raven', 'Owl', 'Swan', 'Falcon', 'Lynx', 'Otter', 'Panda'
];

const generateDeviceId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateAnonymousName = (deviceId: string): string => {
  const hash = deviceId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const colorIndex = Math.abs(hash) % colors.length;
  const animalIndex = Math.abs(hash >> 8) % animals.length;
  
  return `${colors[colorIndex]}${animals[animalIndex]}`;
};

const storeDeviceId = async (deviceId: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  } else {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
};

const getStoredDeviceId = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(DEVICE_ID_KEY);
  } else {
    return await SecureStore.getItemAsync(DEVICE_ID_KEY);
  }
};

export const getOrCreateAnonymousUser = async (): Promise<AnonymousUser> => {
  let deviceId = await getStoredDeviceId();
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    await storeDeviceId(deviceId);
  }
  
  await setDeviceContext(deviceId);
  
  const { data: existingUser } = await supabase
    .from('anonymous_users')
    .select('*')
    .eq('device_id', deviceId)
    .single();
  
  if (existingUser) {
    await supabase
      .from('anonymous_users')
      .update({ last_seen: new Date().toISOString() })
      .eq('device_id', deviceId);
    
    return existingUser;
  }
  
  const generatedName = generateAnonymousName(deviceId);
  const { data: newUser, error } = await supabase
    .from('anonymous_users')
    .insert({
      device_id: deviceId,
      generated_name: generatedName,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create anonymous user: ${error.message}`);
  }
  
  return newUser;
};

export const generateAvatarColor = (name: string): string => {
  const hash = name.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
};
