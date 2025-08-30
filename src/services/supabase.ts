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
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.warn('⚠️ Supabase auth issue:', error.message);
  } else {
    console.log('🔗 Supabase auth status:', {
      hasSession: !!data.session,
      user: data.session?.user?.id ? 'authenticated' : 'anonymous'
    });
  }

  // Test database connection with a simple query
  supabase.from('chat_groups').select('count').limit(1).then(({ data: testData, error: testError }) => {
    if (testError) {
      console.error('❌ Supabase database connection failed:', testError);
    } else {
      console.log('✅ Supabase database connected successfully, found', testData?.[0]?.count || 0, 'chat groups');
    }
  });

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
