import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
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
  return `${y}.${m}.${day} (${w})`;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  if (min % 60 === 0) return `${min / 60}시간`;
  return `${(min / 60).toFixed(1)}시간`;
}

export default function LogScreen() {
  const router = useRouter();
  const { data: sessions, isLoading, error } = useRecentSessions(20);
  const isEmpty = !isLoading && (sessions?.length ?? 0) === 0;

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
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>기록 피드</Text>
          <Text style={s.headerSubtitle}>등반 세션 기록 및 대시보드</Text>
        </View>
        <Pressable
          onPress={() => router.push('/session/new')}
          style={({ pressed }) => [s.headerBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="plus" size={20} color="#ffffff" />
        </Pressable>
      </View>

      {isLoading && (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      )}

      {error && (
        <View style={s.errorContainer}>
          <Text style={s.errorText}>{error.message}</Text>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={
            <>
              {/* Dashboard summary card */}
              <View style={s.statsCard}>
                <View style={s.statsCardHeader}>
                  <Feather name="trending-up" size={14} color="#0d9488" />
                  <Text style={s.statsCardTitle}>최근 등반 통계</Text>
                </View>
                <View style={s.statsRow}>
                  <View style={s.statCol}>
                    <Text style={s.statLabel}>총 세션</Text>
                    <Text style={s.statVal}>{stats.totalSessions}</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statCol}>
                    <Text style={s.statLabel}>총 완등</Text>
                    <Text style={s.statVal}>{stats.totalSends}</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statCol}>
                    <Text style={s.statLabel}>최근 암장</Text>
                    <Text style={s.statValLatest} numberOfLines={1}>
                      {stats.latestGym}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={s.sectionTitle}>지난 세션 목록</Text>

              {isEmpty && (
                <View style={s.emptyCard}>
                  <View style={s.emptyIconWrapper}>
                    <Feather name="activity" size={28} color="#94a3b8" />
                  </View>
                  <Text style={s.emptyTitle}>기록이 존재하지 않습니다</Text>
                  <Text style={s.emptySubtitle}>
                    첫 번째 등반 흔적을 남기고 기록을 쌓아가보세요!
                  </Text>
                  <Pressable
                    onPress={() => router.push('/session/new')}
                    style={({ pressed }) => [s.emptyBtn, { opacity: pressed ? 0.9 : 1 }]}
                  >
                    <Text style={s.emptyBtnText}>등반 기록 추가하기</Text>
                  </Pressable>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => <SessionCard session={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        onPress={() => router.push('/session/new')}
        style={({ pressed }) => [
          s.fab,
          {
            opacity: pressed ? 0.9 : 1,
            shadowColor: '#0d9488',
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          },
        ]}
      >
        <Feather name="plus" size={24} color="#ffffff" />
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
      style={({ pressed }) => [
        s.card,
        {
          backgroundColor: '#ffffff',
          opacity: pressed ? 0.97 : 1,
          shadowColor: '#0f172a',
          shadowOpacity: 0.03,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        },
      ]}
    >
      <View style={s.cardTop}>
        <View style={s.gymInfo}>
          <Text style={s.cardGymName} numberOfLines={1}>
            {gymName}
            {branchName}
          </Text>
          <Text style={s.cardDate}>{formatDate(session.session_date)}</Text>
        </View>
        <View style={s.sendBadge}>
          <Text style={s.sendBadgeText}>완등 {session.send_count}</Text>
        </View>
      </View>

      {session.duration_min != null && (
        <View style={s.durationRow}>
          <Feather name="clock" size={11} color="#64748b" />
          <Text style={s.durationText}>
            {formatDuration(session.duration_min)} 등반 진행
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#0d9488',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    margin: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },

  // Stats Card
  statsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  statsCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  statValLatest: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },

  // Empty View
  emptyCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    marginVertical: 10,
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0d9488',
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Card
  card: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gymInfo: {
    flex: 1,
    paddingRight: 12,
  },
  cardGymName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  sendBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sendBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 12,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
