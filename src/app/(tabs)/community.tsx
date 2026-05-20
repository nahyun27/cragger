import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function CommunityScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="px-6 pt-6 pb-4 border-b border-border-subtle">
        <Text className="text-text-primary text-3xl font-bold tracking-tight">커뮤니티</Text>
      </View>
      
      <View className="flex-1 items-center justify-center p-8">
        <View className="w-20 h-20 bg-background-secondary rounded-full items-center justify-center mb-6">
          <Feather name="users" size={32} color="#0d9488" />
        </View>
        <Text className="text-text-primary text-xl font-bold mb-2">크루들과 함께 등반하세요</Text>
        <Text className="text-text-tertiary text-center text-base leading-6">
          가까운 암장의 크루를 찾거나 등반 기록을 공유할 수 있는 커뮤니티 공간이 준비 중입니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}
