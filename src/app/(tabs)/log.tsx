import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useRecentSessions, type RecentSession } from '@/hooks/use-recent-sessions';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  return `${y}.${m}.${day} ${w}`;
}

export default function LogScreen() {
  const router = useRouter();
  const { data: sessions, isLoading, error } = useRecentSessions(20);
  const isEmpty = !isLoading && (sessions?.length ?? 0) === 0;

  // Calculate some simple stats for the dashboard
  const stats = useMemo(() => {
    if (!sessions) return { totalSessions: 0, totalSends: 0, latestGym: '-' };
    const totalSends = sessions.reduce((acc, s) => acc + (s.send_count || 0), 0);
    const latestGym = sessions[0]?.gym?.name || '-';
    return {
      totalSessions: sessions.length,
      totalSends,
      latestGym,
    };
  }, [sessions]);

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-text-primary text-3xl font-bold tracking-tight">나의 기록</Text>
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      )}

      {error && (
        <View className="mx-6 mt-4 border border-status-danger/30 rounded-xl p-4 bg-status-danger/10">
          <Text className="text-status-danger">{error.message}</Text>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-24 pt-4"
          ListHeaderComponent={
            <>
              {/* Dashboard Summary Card */}
              <View className="bg-background-secondary rounded-2xl p-5 mb-8 shadow-sm border border-border-subtle/50">
                <Text className="text-text-secondary text-sm font-semibold mb-4">최근 활동 요약</Text>
                <View className="flex-row justify-between">
                  <View className="flex-1 items-center">
                    <Text className="text-text-muted text-xs mb-1">총 세션</Text>
                    <Text className="text-brand-primary text-2xl font-bold">{stats.totalSessions}</Text>
                  </View>
                  <View className="w-px bg-border-subtle mx-2" />
                  <View className="flex-1 items-center">
                    <Text className="text-text-muted text-xs mb-1">총 완등</Text>
                    <Text className="text-brand-primary text-2xl font-bold">{stats.totalSends}</Text>
                  </View>
                  <View className="w-px bg-border-subtle mx-2" />
                  <View className="flex-1 items-center">
                    <Text className="text-text-muted text-xs mb-1">최근 암장</Text>
                    <Text className="text-text-primary text-base font-bold mt-1" numberOfLines={1}>{stats.latestGym}</Text>
                  </View>
                </View>
              </View>

              <Text className="text-text-primary text-xl font-bold mb-4">세션 기록</Text>

              {isEmpty && (
                <View className="bg-background-secondary rounded-2xl p-8 items-center mt-2 border border-border-subtle border-dashed">
                  <Feather name="activity" size={48} color="#a1a1aa" className="mb-4" />
                  <Text className="text-text-secondary font-semibold text-lg mb-1">아직 기록이 없어요</Text>
                  <Text className="text-text-tertiary text-sm text-center">
                    오른쪽 아래 ⊕ 버튼을 눌러 첫 등반을 기록해보세요!
                  </Text>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => <SessionCard session={item} />}
          ItemSeparatorComponent={() => <View className="h-4" />}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        onPress={() => router.push('/session/new')}
        className="absolute bottom-6 right-6 w-16 h-16 bg-brand-primary rounded-full items-center justify-center shadow-lg active:bg-brand-accent elevation-md"
      >
        <Feather name="plus" size={32} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}

function SessionCard({ session }: { session: RecentSession }) {
  const router = useRouter();
  const gymName = session.gym?.name || '암장 미선택';
  const branchName = session.gym?.branch ? ` ${session.gym.branch}` : '';
  
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
      className="bg-background-primary border border-border-subtle rounded-2xl p-4 active:bg-background-secondary shadow-sm"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 pr-4">
          <Text className="text-text-primary text-lg font-bold" numberOfLines={1}>
            {gymName}{branchName}
          </Text>
          <Text className="text-text-tertiary text-sm mt-0.5">
            {formatDate(session.session_date)}
          </Text>
        </View>
        <View className="bg-brand-primary/10 px-3 py-1.5 rounded-full">
          <Text className="text-brand-primary font-bold text-sm">
            완등 {session.send_count}
          </Text>
        </View>
      </View>
      
      {session.duration_min != null && (
        <View className="flex-row items-center mt-2 bg-background-secondary self-start px-2 py-1 rounded-md">
          <Feather name="clock" size={12} color="#71717a" />
          <Text className="text-text-secondary text-xs ml-1 font-medium">
            {formatDuration(session.duration_min)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  if (min % 60 === 0) return `${min / 60}시간`;
  return `${(min / 60).toFixed(1)}시간`;
}
