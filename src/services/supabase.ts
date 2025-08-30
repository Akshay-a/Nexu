import { createClient } from '@supabase/supabase-js';
import { CONFIG, validateConfig } from '../config/environment';

// Validate configuration but don't crash the app
try {
  validateConfig();
  console.log('✅ Configuration validated successfully');
} catch (error) {
  console.error('❌ Configuration validation failed:', error);
  // Continue anyway for development - you can still use the app with limited functionality
}

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test the connection
supabase.auth.getSession().then(({ error }) => {
  if (error) {
    console.warn('⚠️ Supabase connection issue:', error.message);
  } else {
    console.log('🔗 Supabase connected successfully');
  }
}).catch((err) => {
  console.warn('⚠️ Failed to test Supabase connection:', err.message);
});

export const setDeviceContext = async (deviceId: string) => {
  const { error } = await supabase.rpc('set_config', {
    setting_name: 'app.current_device_id',
    setting_value: deviceId,
    is_local: true
  });
  
  if (error) {
    console.warn('Failed to set device context:', error);
  }
};
