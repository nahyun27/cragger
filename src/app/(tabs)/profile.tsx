import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GymStatsCard } from '@/components/stats/gym-stats-card';
import { useProfile } from '@/hooks/use-profile';
import { useUserStats } from '@/hooks/use-user-stats';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const DEFAULT_EXPANDED_COUNT = 2;

export default function ProfileScreen() {
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const { data: stats, isLoading, error } = useUserStats();

  const email = session?.user.email ?? '';
  const username = profile?.username ?? '...';
  const firstChar = username && username.length > 0 ? username.charAt(0).toUpperCase() : '?';

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <ScrollView contentContainerClassName="pb-10">
        {/* Profile header */}
        <View className="px-6 pt-4 flex-row items-center gap-3">
          <View className="w-16 h-16 rounded-full bg-brand-primary items-center justify-center">
            <Text className="text-background-primary text-2xl font-bold">{firstChar}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-primary text-lg font-bold" numberOfLines={1}>
              {username}
            </Text>
            <Text className="text-text-tertiary text-xs" numberOfLines={1}>
              {email}
            </Text>
          </View>
          <Pressable
            onPress={() => supabase.auth.signOut()}
            className="px-3 py-1.5 rounded-md border border-border-default active:bg-background-secondary"
          >
            <Text className="text-text-secondary text-sm">로그아웃</Text>
          </Pressable>
        </View>

        {/* Stats section */}
        <View className="px-6 mt-8">
          <Text className="text-text-primary text-xl font-bold mb-4">나의 운동 통계</Text>

          {isLoading && (
            <View className="py-8 items-center">
              <ActivityIndicator />
            </View>
          )}

          {error && (
            <View className="border border-status-danger rounded-md p-3 bg-background-secondary">
              <Text className="text-status-danger">{error.message}</Text>
            </View>
          )}

          {stats && (
            <>
              {/* Summary card: 3 metrics */}
              <View className="bg-background-secondary rounded-2xl p-5 mb-6">
                <View className="flex-row justify-between">
                  <SummaryMetric label="총 세션" value={stats.totalSessions} />
                  <Divider />
                  <SummaryMetric label="총 완등" value={stats.totalSends} />
                  <Divider />
                  <SummaryMetric label="활동 일수" value={stats.activityDays} />
                </View>
              </View>

              {/* Gym list */}
              {stats.gyms.length === 0 ? (
                <View className="bg-background-secondary rounded-2xl p-6 items-center">
                  <Text className="text-text-secondary text-base">
                    아직 운동 기록이 없어요
                  </Text>
                  <Text className="text-text-tertiary text-sm mt-1">
                    기록 탭에서 첫 세션을 추가해보세요
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {stats.gyms.map((gym, i) => (
                    <GymStatsCard
                      key={gym.gymId}
                      gym={gym}
                      defaultExpanded={i < DEFAULT_EXPANDED_COUNT}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-text-muted text-xs mb-1">{label}</Text>
      <Text className="text-brand-primary text-2xl font-bold">{value}</Text>
    </View>
  );
}

function Divider() {
  return <View className="w-px bg-border-subtle mx-2" />;
}
