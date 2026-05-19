import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="log" options={{ title: '기록' }} />
      <Tabs.Screen name="gyms" options={{ title: '암장' }} />
      <Tabs.Screen name="profile" options={{ title: '프로필' }} />
    </Tabs>
  );
}
