import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 사후 기록 모드로 전환됨. active-session redirect 로직 제거.
// Phase 4에서 최근 세션 리스트 추가 예정.
export default function LogScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="flex-1 p-4 gap-5">
        <Text className="text-text-primary text-2xl font-bold">기록</Text>
        <Text className="text-text-secondary">
          운동 끝나고 한 번에 기록하세요
        </Text>
        <Pressable
          onPress={() => router.push('/session/new')}
          className="bg-brand-primary rounded-md p-4 items-center"
        >
          <Text className="text-background-primary font-semibold">
            오늘 운동 기록
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
