import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '../types/app';
import { signUp, signIn } from '../services/auth';

type AuthNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

const AuthScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    console.log('🔐 Auth form submission started:', { isLogin, email: email ? 'provided' : 'empty' });
    
    if (!email || !password) {
      console.warn('⚠️ Auth validation failed: missing fields');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    console.log('🔄 Setting loading state and starting auth...');
    setLoading(true);
    
    try {
      if (isLogin) {
        console.log('🔑 Attempting sign in...');
        const result = await signIn(email, password);
        console.log('✅ Sign in successful:', { user: result?.user?.email });
        Alert.alert('Success', 'Welcome back!');
      } else {
        console.log('✨ Attempting sign up...');
        const result = await signUp(email, password);
        console.log('✅ Sign up successful:', { user: result?.user?.email });
        Alert.alert('Success', 'Account created! Please check your email for verification.');
      }
      
      console.log('🧭 Navigating back from auth screen...');
      navigation.goBack();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      console.error('❌ Auth error:', errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      console.log('🏁 Auth process completed, removing loading state');
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>N</Text>
            </View>
            <Text style={styles.title}>
              {isLogin ? 'Welcome Back' : 'Join as Creator'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin 
                ? 'Sign in to access your chat groups' 
                : 'Sign up to create and manage your own local chat groups'
              }
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Choose a secure password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF5E5" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isLogin ? '🔑 Sign In' : '✨ Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={toggleMode}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>
                {isLogin 
                  ? 'Need an account? Sign Up' 
                  : 'Already have an account? Sign In'
                }
              </Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsTitle}>💡 Why sign up?</Text>
              <Text style={styles.benefitsText}>
                • Create up to 3 location-based chats{'\n'}
                • Manage your chat communities{'\n'}
                • Still participate anonymously in others
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E5',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    height: 60,
    backgroundColor: '#19323C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#FFF5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF5E5',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: '#FF7E67',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#19323C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#19323C',
    opacity: 0.7,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#19323C',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#C9F5D3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#19323C',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  primaryButton: {
    backgroundColor: '#FF7E67',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF5E5',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#85DCBA',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#19323C',
  },
  benefitsCard: {
    backgroundColor: '#C9F5D3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#19323C',
    marginBottom: 8,
  },
  benefitsText: {
    fontSize: 12,
    color: '#19323C',
    opacity: 0.8,
    textAlign: 'left',
  },
});

export default AuthScreen;
