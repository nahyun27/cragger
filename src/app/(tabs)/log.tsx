import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActiveSession } from '@/hooks/use-session';

export default function LogScreen() {
  const router = useRouter();
  const { data: activeSession, isLoading } = useActiveSession();

  useEffect(() => {
    if (isLoading) return;
    if (activeSession?.id) {
      router.replace({ pathname: '/session/[id]', params: { id: activeSession.id } });
    }
  }, [activeSession, isLoading, router]);

  if (isLoading || activeSession) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top']}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="flex-1 p-4 gap-5">
        <Text className="text-text-primary text-2xl font-bold">기록</Text>
        <View className="gap-2">
          <Text className="text-text-secondary">진행 중인 세션이 없어요</Text>
          <Text className="text-text-tertiary text-sm">
            새 세션을 시작하고 등반을 기록해보세요
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/session/new')}
          className="bg-brand-primary rounded-md p-4 items-center"
        >
          <Text className="text-background-primary font-semibold">새 세션 시작</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
