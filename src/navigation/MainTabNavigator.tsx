import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

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
          backgroundColor: '#FFF5E5',
          borderTopColor: '#85DCBA',
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#19323C',
        tabBarInactiveTintColor: '#85DCBA',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          tabBarIcon: () => '🗺️',
          tabBarLabel: 'Map',
        }}
      />
      <Tab.Screen 
        name="ChatList" 
        component={ChatListScreen}
        options={{
          tabBarIcon: () => '💬',
          tabBarLabel: 'Chats',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
