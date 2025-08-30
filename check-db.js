const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabase() {
  console.log('🔍 Checking database for chat groups...');

  try {
    // First, let's test the connection
    console.log('🔗 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase.from('chat_groups').select('count').limit(1);
    console.log('🔗 Connection test result:', { testData, testError });

    // Check if chat_groups table exists and has data
    console.log('📊 Querying chat_groups table...');
    const { data: groups, error } = await supabase
      .from('chat_groups')
      .select('*')
      .limit(10);

    console.log('📊 Query result:', {
      error: error?.message,
      errorCode: error?.code,
      dataLength: groups?.length || 0,
      hasData: !!groups
    });

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    console.log('📊 Chat groups in database:', groups?.length || 0);
    if (groups && groups.length > 0) {
      console.log('📋 Sample chat groups:', groups.map(g => ({
        id: g.id,
        name: g.name,
        location: `${g.lat}, ${g.lng}`,
        active: g.is_active,
        h3_index: g.h3_index_8?.substring(0, 10) + '...'
      })));

      // Test the exact same query as the app uses
      console.log('🎯 Testing app query: SELECT * FROM chat_groups WHERE is_active = true ORDER BY last_activity DESC');
      const { data: activeGroups, error: activeError } = await supabase
        .from('chat_groups')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      console.log('🎯 App query result:', {
        error: activeError?.message,
        dataLength: activeGroups?.length || 0,
        data: activeGroups
      });

    } else {
      console.log('⚠️ No chat groups found in database!');
    }

    // Test the exact distance calculation the app uses
    console.log('📏 Testing distance calculation...');
    const userLat = -33.8737;
    const userLng = 151.0950;

    groups.forEach(group => {
      const distance = calculateDistance(userLat, userLng, group.lat, group.lng);
      console.log(`📏 Distance to "${group.name}": ${distance.toFixed(2)}km (within 5km: ${distance <= 5})`);
    });

    // Also check anonymous users
    const { data: users, error: userError } = await supabase
      .from('anonymous_users')
      .select('*')
      .limit(5);

    if (!userError) {
      console.log('👥 Anonymous users in database:', users?.length || 0);
    }

  } catch (err) {
    console.error('❌ Connection error:', err);
  }

  // Helper function for distance calculation
  function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

checkDatabase();
