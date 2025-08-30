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
  console.log('👤 Getting or creating anonymous user...');
  
  let deviceId = await getStoredDeviceId();
  console.log('📱 Stored device ID:', deviceId ? 'Found' : 'Not found');
  
  if (!deviceId) {
    console.log('🆕 Generating new device ID...');
    deviceId = generateDeviceId();
    console.log('📱 Generated device ID:', deviceId);
    await storeDeviceId(deviceId);
    console.log('💾 Device ID stored successfully');
  } else {
    console.log('♻️ Using existing device ID:', deviceId);
  }
  
  console.log('🔗 Setting device context...');
  await setDeviceContext(deviceId);
  
  console.log('🔍 [DB LOOKUP] Checking for existing user in database...', {
    deviceId: deviceId.substring(0, 10) + '...',
    query: 'SELECT * FROM anonymous_users WHERE device_id = ?'
  });
  const { data: existingUser, error: fetchError } = await supabase
    .from('anonymous_users')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  console.log('🔍 [DB LOOKUP RESULT] Database query result:', {
    success: !fetchError,
    foundUser: !!existingUser,
    errorCode: fetchError ? fetchError.code : null,
    errorMessage: fetchError ? fetchError.message : null,
    userData: existingUser ? {
      id: existingUser.id,
      name: existingUser.generated_name,
      deviceId: existingUser.device_id.substring(0, 10) + '...',
      createdAt: existingUser.created_at,
      lastSeen: existingUser.last_seen
    } : null
  });

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('❌ [DB LOOKUP ERROR] Error fetching existing user:', fetchError);
  }
  
  if (existingUser) {
    console.log('✅ Found existing anonymous user:', {
      name: existingUser.generated_name,
      created: existingUser.created_at,
      lastSeen: existingUser.last_seen
    });
    
    console.log('🔄 Updating last seen timestamp...');
    const { error: updateError } = await supabase
      .from('anonymous_users')
      .update({ last_seen: new Date().toISOString() })
      .eq('device_id', deviceId);
    
    if (updateError) {
      console.warn('⚠️ Failed to update last seen:', updateError);
    } else {
      console.log('✅ Last seen updated successfully');
    }
    
    console.log('🎭 Returning existing anonymous user:', existingUser.generated_name);
    return existingUser;
  }
  
  console.log('🎭 Creating new anonymous user...');
  const generatedName = generateAnonymousName(deviceId);
  console.log('🎨 Generated name:', generatedName);
  
  const { data: newUser, error } = await supabase
    .from('anonymous_users')
    .insert({
      device_id: deviceId,
      generated_name: generatedName,
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to create anonymous user:', error);
    throw new Error(`Failed to create anonymous user: ${error.message}`);
  }
  
  console.log('✅ New anonymous user created:', {
    name: newUser.generated_name,
    deviceId: newUser.device_id,
    created: newUser.created_at
  });
  
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
