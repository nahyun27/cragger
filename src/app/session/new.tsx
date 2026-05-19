import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Phase 1 stub. 실제 사후 기록 폼은 Phase 3에서 구현 (날짜 / 암장 / 컨디션 /
// 8색 카운터 / 메모 / 기록 버튼).
export default function NewSessionScreen() {
  const router = useRouter();
  return (
    <SafeAreaView
      className="flex-1 bg-background-primary items-center justify-center p-6"
      edges={['top', 'bottom']}
    >
      <Text className="text-text-secondary mb-4">
        사후 기록 화면 — Phase 3에서 구현
      </Text>
      <Pressable
        onPress={() => router.back()}
        className="border border-border-default rounded-md px-4 py-2"
      >
        <Text className="text-text-primary">돌아가기</Text>
      </Pressable>
    </SafeAreaView>
  );
}
