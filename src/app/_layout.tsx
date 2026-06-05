import '@/global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { initializeKakaoSDK } from '@react-native-kakao/core';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { CustomAlert } from '@/components/ui/custom-alert';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useEffectiveScheme, useHydrateThemePref } from '@/lib/theme';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  useHydrateThemePref();

  // 카카오 SDK init — 마운트 후 1회.
  // 모듈 top-level 에 두면 module evaluation 순서가 꼬여서 navigation context 가
  // 깨지는 케이스가 있어서 useEffect 안으로 옮김.
  useEffect(() => {
    Promise.resolve()
      .then(() => initializeKakaoSDK('d09b0c3a5e47ff05356be90d04a4a643'))
      .catch((e) => {
        console.warn('[Kakao] SDK init skipped (likely Expo Go / dev):', e?.message ?? e);
      });
  }, []);

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
  const { isLoading } = useAuth();

  // ThemeProvider value 는 reference 안정성이 중요 — 매 렌더마다 새 객체가 들어가면
  // 다크/라이트 토글 시 react-navigation 의 internal 트리가 흔들리면서 자식 화면이
  // 일시적으로 navigation context 를 잃음. useMemo 로 scheme 가 바뀔 때만 새 reference.
  const navTheme = React.useMemo(
    () => (scheme === 'dark' ? DarkTheme : DefaultTheme),
    [scheme],
  );

  // Auth 로딩 중에는 Stack 자체를 mount 하지 않음 → useSegments/useRouter 호출 없이 대기.
  // 이전에 RootStack 안에서 isLoading 체크 + 네비 훅 호출을 같이 했더니
  // expo-router 초기 mount 와 race 가 나면서 "navigation context 없음" 에러가 가끔 떴음.
  // → 훅 호출을 SessionRedirector 컴포넌트로 분리해서 Stack 이 실제로 마운트된 뒤에만 평가.
  return (
    <View className={scheme === 'dark' ? 'dark flex-1' : 'flex-1'}>
      <ThemeProvider value={navTheme}>
        <AnimatedSplashOverlay />
        {isLoading ? (
          <View className="flex-1 items-center justify-center bg-background-primary">
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="auth" />
            </Stack>
            <SessionRedirector />
          </>
        )}
        <CustomAlert />
      </ThemeProvider>
    </View>
  );
}

// 세션 기반 자동 리다이렉트 — Stack 마운트 이후에만 평가되도록 별도 컴포넌트로 분리.
function SessionRedirector() {
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === 'auth';
    if (!session && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments, router]);

  return null;
}
