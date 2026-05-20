import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GymStatsCard } from '@/components/stats/gym-stats-card';
import { useProfile } from '@/hooks/use-profile';
import { useUserStats } from '@/hooks/use-user-stats';
import {
  daysFromTodayTo,
  isExpiringSoon,
  isMembershipExpired,
  useMemberships,
  useUsePass,
  type MembershipRow,
} from '@/hooks/use-memberships';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const DEFAULT_EXPANDED_COUNT = 2;

export default function ProfileScreen() {
  const router = useRouter();
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
            <Pressable
              onPress={() => router.push('/profile/edit')}
              className="mt-1.5 self-start active:opacity-60"
              hitSlop={6}
            >
              {profile?.instagram_handle ? (
                <Text className="text-brand-primary text-xs font-medium">
                  📷 @{profile.instagram_handle}
                </Text>
              ) : (
                <Text className="text-text-tertiary text-xs">+ Instagram 추가</Text>
              )}
            </Pressable>
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

        <MembershipsSection />
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

function MembershipsSection() {
  const router = useRouter();
  const { data, isLoading, error } = useMemberships();

  const { active, expired } = React.useMemo(() => {
    if (!data) return { active: [] as MembershipRow[], expired: [] as MembershipRow[] };
    const a: MembershipRow[] = [];
    const e: MembershipRow[] = [];
    for (const m of data) {
      (isMembershipExpired(m) ? e : a).push(m);
    }
    // 활성: 만료 임박 먼저
    a.sort((m1, m2) => urgencyScore(m1) - urgencyScore(m2));
    // 만료: 최근 종료 먼저
    e.sort((m1, m2) =>
      (m2.end_date ?? m2.start_date).localeCompare(m1.end_date ?? m1.start_date),
    );
    return { active: a, expired: e };
  }, [data]);

  return (
    <View className="px-6 mt-10">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-text-primary text-xl font-bold">내 회원권</Text>
        <Pressable
          onPress={() => router.push('/membership/new')}
          className="px-3 py-1.5 rounded-md bg-brand-primary active:opacity-80"
        >
          <Text className="text-background-primary text-sm font-semibold">+ 추가</Text>
        </Pressable>
      </View>

      {isLoading && (
        <View className="py-4 items-center">
          <ActivityIndicator />
        </View>
      )}

      {error && (
        <View className="border border-status-danger rounded-md p-3 bg-background-secondary">
          <Text className="text-status-danger">{error.message}</Text>
        </View>
      )}

      {data && active.length === 0 && expired.length === 0 && (
        <View className="bg-background-secondary rounded-2xl p-6 items-center">
          <Text className="text-text-secondary text-base">등록된 회원권이 없어요</Text>
          <Text className="text-text-tertiary text-sm mt-1">
            우측 상단 + 추가 버튼으로 등록하세요
          </Text>
        </View>
      )}

      {active.length > 0 && (
        <View className="gap-2">
          {active.map((m) => (
            <MembershipCard key={m.id} membership={m} />
          ))}
        </View>
      )}

      {expired.length > 0 && (
        <View className="mt-4 gap-2">
          <Text className="text-text-tertiary text-xs px-1">지난 회원권</Text>
          {expired.map((m) => (
            <MembershipCard key={m.id} membership={m} expired />
          ))}
        </View>
      )}
    </View>
  );
}

function urgencyScore(m: MembershipRow): number {
  if (m.membership_type === 'passes' && m.total_passes != null) {
    return Math.max(0, m.total_passes - m.used_passes);
  }
  if (m.end_date) return Math.max(0, daysFromTodayTo(m.end_date));
  return 9999;
}

function MembershipCard({
  membership,
  expired,
}: {
  membership: MembershipRow;
  expired?: boolean;
}) {
  const router = useRouter();
  const usePass = useUsePass();
  const gymLabel = membership.gym
    ? `${membership.gym.name}${membership.gym.branch ? ` ${membership.gym.branch}` : ''}`
    : '암장 미선택';
  const expSoon = !expired && isExpiringSoon(membership);

  function handleUsePass() {
    Alert.alert(
      '1회 사용',
      `1회 차감할까요? ${membership.used_passes} → ${membership.used_passes + 1}회`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차감',
          onPress: () => {
            usePass
              .mutateAsync({ id: membership.id, current: membership.used_passes })
              .catch((e) =>
                Alert.alert('차감 실패', e instanceof Error ? e.message : '오류'),
              );
          },
        },
      ],
    );
  }

  return (
    <View
      className={`flex-row items-center border rounded-lg overflow-hidden ${
        expired
          ? 'border-border-subtle bg-background-secondary opacity-60'
          : expSoon
            ? 'border-status-danger bg-background-primary'
            : 'border-border-subtle bg-background-primary'
      }`}
    >
      <Pressable
        onPress={() =>
          router.push({ pathname: '/membership/[id]', params: { id: membership.id } })
        }
        className="flex-1 p-3 active:opacity-70"
      >
        <Text
          className={`text-base font-semibold ${
            expired ? 'text-text-tertiary' : 'text-text-primary'
          }`}
          numberOfLines={1}
        >
          {gymLabel}
        </Text>
        <Text
          className={`text-sm mt-0.5 ${
            expSoon ? 'text-status-danger font-medium' : 'text-text-secondary'
          }`}
        >
          {formatMembershipSubtitle(membership, expired)}
        </Text>
      </Pressable>

      {!expired && membership.membership_type === 'passes' && (
        <Pressable
          onPress={handleUsePass}
          disabled={
            usePass.isPending ||
            (membership.total_passes != null &&
              membership.used_passes >= membership.total_passes)
          }
          className="px-3 py-3 border-l border-border-subtle active:bg-background-secondary"
        >
          {usePass.isPending ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-text-primary text-sm font-medium">1회 사용</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function formatMembershipSubtitle(m: MembershipRow, expired?: boolean): string {
  switch (m.membership_type) {
    case 'monthly':
    case 'period': {
      const label = m.membership_type === 'monthly' ? '월 회원권' : '기간권';
      if (!m.end_date) return label;
      if (expired) return `${label} · 종료됨 (${m.end_date})`;
      const days = daysFromTodayTo(m.end_date);
      return `${label} · D-${days} 남음`;
    }
    case 'passes': {
      const total = m.total_passes ?? 0;
      const remaining = Math.max(0, total - m.used_passes);
      if (expired) return `${total}회권 · 소진됨`;
      return `${total}회권 · ${remaining}회 남음`;
    }
    case 'single':
      return expired ? `1일권 · 종료 (${m.start_date})` : `1일권 · ${m.start_date} 방문`;
    default:
      return '';
  }
}
