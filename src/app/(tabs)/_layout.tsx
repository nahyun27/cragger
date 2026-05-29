import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { useThemeColors } from '@/lib/theme';

export default function TabLayout() {
  const c = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text.primary,
        tabBarInactiveTintColor: c.text.muted,
        tabBarStyle: {
          backgroundColor: c.bg.card,
          borderTopColor: c.border.subtle,
          paddingBottom: 20,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} size={size * 1.1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: '기록',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'pencil-circle' : 'pencil-circle-outline'} size={size * 1.1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gyms"
        options={{
          title: '암장',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'map' : 'map-outline'} size={size * 1.1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '커뮤니티',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'account-group' : 'account-group-outline'} size={size * 1.1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'account-circle' : 'account-circle-outline'} size={size * 1.1} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
