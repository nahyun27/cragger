import '@/global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useEffectiveScheme, useHydrateThemePref } from '@/lib/theme';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  useHydrateThemePref();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemedRoot />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function ThemedRoot() {
  const scheme = useEffectiveScheme();
  // NativeWind v4 — `dark` 클래스를 root 에 적용해서 자식의 .dark 변형 활성화.
  return (
    <View className={scheme === 'dark' ? 'dark flex-1' : 'flex-1'}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <RootStack />
      </ThemeProvider>
    </View>
  );
}

function RootStack() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!session && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background-primary">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
    </Stack>
  );
}
