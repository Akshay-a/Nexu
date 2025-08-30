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
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (!profile) {
    return null;
  }
  
  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name,
  };
};
