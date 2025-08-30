import { supabase } from './supabase';
import { User } from '../types/app';

export const signUp = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  if (!data.user) {
    throw new Error('Failed to create user');
  }
  
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();
  
  if (!profile) {
    throw new Error('Failed to create user profile');
  }
  
  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name,
  };
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  if (!data.user) {
    throw new Error('Failed to sign in');
  }
  
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();
  
  if (!profile) {
    throw new Error('User profile not found');
  }
  
  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name,
  };
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // This function should only be called when we already know there's a session
    // Use the cached user from auth context to avoid extra network calls
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('Auth error in getCurrentUser:', authError.message);
      return null;
    }
    
    if (!user) {
      console.log('No authenticated user found - this should not happen if called correctly');
      return null;
    }
    
    console.log('Fetching user profile for authenticated user...');
    
    // Fetch user profile from database with shorter timeout since we know user exists
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.log('Profile query error:', profileError.message);
      return null;
    }
    
    if (!profile) {
      console.log('No user profile found in database for authenticated user');
      return null;
    }
    
    console.log('Successfully retrieved user profile');
    return {
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('getCurrentUser failed:', errorMessage);
    return null;
  }
};
