import React, { useEffect } from 'react';
import 'react-native-gesture-handler';

import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  useEffect(() => {
    console.log('🚀 NexU App starting...');
    console.log('📅 App start time:', new Date().toISOString());
    console.log('🔧 Environment: Development');
    
    // Log app restart detection
    const sessionId = Date.now().toString();
    console.log('🔄 Session ID:', sessionId);
    console.log('📋 This will help track app restarts for persistence testing');
    
    return () => {
      console.log('👋 App cleanup/unmount');
    };
  }, []);

  console.log('🎨 App component rendering...');

  return (
    <ErrorBoundary>
      <AppNavigator />
    </ErrorBoundary>
  );
}
