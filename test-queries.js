const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testQueries() {
  console.log('🧪 Testing different database queries...');

  try {
    // Test 1: Simple select with limit
    console.log('Test 1: Basic select with limit...');
    const { data: data1, error: error1 } = await supabase
      .from('chat_groups')
      .select('*')
      .limit(5);

    console.log('Result 1:', {
      success: !error1,
      error: error1?.message,
      errorCode: error1?.code,
      count: data1?.length || 0,
      data: data1
    });

    // Test 2: Select with is_active filter
    console.log('Test 2: Select with is_active filter...');
    const { data: data2, error: error2 } = await supabase
      .from('chat_groups')
      .select('*')
      .eq('is_active', true)
      .limit(5);

    console.log('Result 2:', {
      success: !error2,
      error: error2?.message,
      errorCode: error2?.code,
      count: data2?.length || 0,
      data: data2
    });

    // Test 3: Count query
    console.log('Test 3: Count query...');
    const { count, error: error3 } = await supabase
      .from('chat_groups')
      .select('*', { count: 'exact', head: true });

    console.log('Result 3:', {
      success: !error3,
      error: error3?.message,
      errorCode: error3?.code,
      count: count
    });

  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testQueries();
