import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRecentSessions, type RecentSession } from '@/hooks/use-recent-sessions';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(iso: string): string {
  // iso = 'YYYY-MM-DD' — 'Date'로 파싱 시 로컬 자정 기준이라 요일 어긋날 수 있음.
  // 'YYYY-MM-DDT00:00:00' 명시로 안정화.
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  return `${y}.${m}.${day} ${w}`;
}

export default function LogScreen() {
  const router = useRouter();
  const { data: sessions, isLoading, error } = useRecentSessions(10);
  const isEmpty = !isLoading && (sessions?.length ?? 0) === 0;

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="px-4 pt-2 pb-3 gap-3">
        <Text className="text-text-primary text-2xl font-bold">기록</Text>
        <Pressable
          onPress={() => router.push('/session/new')}
          className="bg-brand-primary rounded-md p-4 items-center"
        >
          <Text className="text-background-primary font-semibold">
            오늘 운동 기록
          </Text>
        </Pressable>
      </View>

      {isLoading && (
        <View className="p-6 items-center">
          <ActivityIndicator />
        </View>
      )}

      {error && (
        <View className="mx-4 mb-3 border border-status-danger rounded-md p-3 bg-background-secondary">
          <Text className="text-status-danger">{error.message}</Text>
        </View>
      )}

      {isEmpty && (
        <View className="px-4 mt-4">
          <Text className="text-text-secondary">아직 기록한 세션이 없어요</Text>
          <Text className="text-text-tertiary text-sm mt-1">
            첫 운동 끝나고 위 버튼으로 기록해보세요
          </Text>
        </View>
      )}

      {sessions && sessions.length > 0 && (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SessionRow session={item} />}
          contentContainerClassName="px-4 pb-6"
          ItemSeparatorComponent={() => (
            <View className="h-px bg-border-subtle" />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function SessionRow({ session }: { session: RecentSession }) {
  const router = useRouter();
  const gymLabel = session.gym
    ? `${session.gym.name}${session.gym.branch ? ` ${session.gym.branch}` : ''}`
    : '암장 미선택';
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/session/[id]', params: { id: session.id } })
      }
      className="flex-row items-center py-3 gap-3 active:opacity-60"
    >
      <View className="flex-1 gap-1">
        <Text className="text-text-primary text-base">
          {formatDate(session.session_date)} · {gymLabel}
        </Text>
        <Text className="text-text-tertiary text-sm">
          완등 {session.send_count}개
          {session.duration_min != null && ` · ${formatDuration(session.duration_min)}`}
        </Text>
      </View>
      <Text className="text-text-tertiary text-lg">›</Text>
    </Pressable>
  );
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  if (min % 60 === 0) return `${min / 60}시간`;
  return `${(min / 60).toFixed(1)}시간`;
}
