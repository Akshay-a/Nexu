import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Text } from 'react-native';

import { MainTabParamList } from '../types/app';
import MapScreen from '../screens/MapScreen';
import ChatListScreen from '../screens/ChatListScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#19323C',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          paddingTop: 12,
          paddingHorizontal: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: '#FF7E67',
        tabBarInactiveTintColor: '#85DCBA',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          borderRadius: 12,
          marginHorizontal: 8,
        },
      }}
    >
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Text style={{ 
              color: focused ? '#FF7E67' : '#85DCBA', 
              fontSize: 20, 
              opacity: focused ? 1 : 0.7 
            }}>
              🗺️
            </Text>
          ),
          tabBarLabel: 'Discover',
        }}
      />
      <Tab.Screen 
        name="ChatList" 
        component={ChatListScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Text style={{ 
              color: focused ? '#FF7E67' : '#85DCBA', 
              fontSize: 20, 
              opacity: focused ? 1 : 0.7 
            }}>
              💬
            </Text>
          ),
          tabBarLabel: 'Chats',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
