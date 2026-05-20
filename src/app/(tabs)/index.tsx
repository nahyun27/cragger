import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useCommunityFeed, type PostRow } from '@/hooks/use-community';
import { useHomeStats } from '@/hooks/use-home-stats';
import { useProfile } from '@/hooks/use-profile';
import { useRecentSessions, type RecentSession } from '@/hooks/use-recent-sessions';
import { useUserStats } from '@/hooks/use-user-stats';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatTodayLong(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day} (${KO_WEEKDAYS[d.getDay()]})`;
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}.${day} (${KO_WEEKDAYS[d.getDay()]})`;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  if (min % 60 === 0) return `${min / 60}시간`;
  return `${(min / 60).toFixed(1)}시간`;
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const profileQ = useProfile();
  const weekQ = useHomeStats();
  const recentQ = useRecentSessions(3);
  const userStatsQ = useUserStats();
  const feedQ = useCommunityFeed('all');

  const username = profileQ.data?.username ?? '클라이머';
  const recent = recentQ.data ?? [];
  const topGym = userStatsQ.data?.gyms[0];
  const latestPosts = useMemo<PostRow[]>(
    () => (feedQ.data?.pages.flat() ?? []).slice(0, 2),
    [feedQ.data],
  );

  const refreshing =
    weekQ.isRefetching ||
    recentQ.isRefetching ||
    userStatsQ.isRefetching ||
    feedQ.isRefetching;

  function refetchAll() {
    weekQ.refetch();
    recentQ.refetch();
    userStatsQ.refetch();
    feedQ.refetch();
    profileQ.refetch();
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor="#06b6d4" />
        }
      >
        {/* Greeting */}
        <View style={s.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetingHello} numberOfLines={1}>
              안녕하세요, {username}님
            </Text>
            <Text style={s.greetingDate}>{formatTodayLong()}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            hitSlop={6}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={s.avatarBtn}>
              {profileQ.data?.avatar_url ? (
                <Image
                  source={{ uri: profileQ.data.avatar_url }}
                  style={s.avatarBtnImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={s.avatarBtnChar}>
                  {(username[0] ?? '?').toUpperCase()}
                </Text>
              )}
            </View>
          </Pressable>
        </View>

        {/* Quick actions */}
        <View style={s.quickActions}>
          <Pressable
            onPress={() => router.push('/session/new')}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={s.actionPrimary}>
              <View style={s.actionIconPrimary}>
                <Feather name="edit-3" size={20} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionPrimaryTitle}>오늘 운동 기록</Text>
                <Text style={s.actionPrimarySub}>색깔별 시도·완등 입력</Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/gyms')}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={s.actionSecondary}>
              <View style={s.actionIconSecondary}>
                <Feather name="map-pin" size={20} color="#475569" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionSecondaryTitle}>암장 찾기</Text>
                <Text style={s.actionSecondarySub}>주변·즐겨찾기</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* This week summary */}
        <SectionHeader title="이번 주 요약" />
        <View style={s.weekCard}>
          {weekQ.isLoading ? (
            <ActivityIndicator color="#06b6d4" />
          ) : weekQ.data && (weekQ.data.weeklySessions > 0 || weekQ.data.weeklySends > 0) ? (
            <View style={s.weekRow}>
              <WeekMetric
                label="세션"
                value={String(weekQ.data.weeklySessions)}
                icon="calendar"
              />
              <WeekDivider />
              <WeekMetric
                label="완등"
                value={String(weekQ.data.weeklySends)}
                icon="check-circle"
              />
              <WeekDivider />
              <WeekMetric
                label="최고"
                value={weekQ.data.maxVGrade ?? '-'}
                icon="award"
              />
            </View>
          ) : (
            <View style={s.weekEmpty}>
              <Feather name="activity" size={20} color="#94a3b8" />
              <Text style={s.weekEmptyText}>이번 주 첫 기록을 남겨보세요</Text>
            </View>
          )}
        </View>

        {/* Recent sessions */}
        <SectionHeader
          title="최근 세션"
          actionLabel="더보기"
          onAction={() => router.push('/(tabs)/log')}
        />
        {recentQ.isLoading ? (
          <View style={s.sectionLoader}>
            <ActivityIndicator color="#06b6d4" />
          </View>
        ) : recent.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyCardText}>아직 기록이 없어요</Text>
          </View>
        ) : (
          <View style={s.sessionList}>
            {recent.map((sess) => (
              <SessionRow key={sess.id} session={sess} />
            ))}
          </View>
        )}

        {/* Top gym (conditional) */}
        {topGym && (
          <>
            <SectionHeader title="단골 암장" />
            <Pressable
              onPress={() =>
                router.push({ pathname: '/gym/[id]', params: { id: topGym.gymId } })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={s.gymCard}>
                <View style={s.gymCardIcon}>
                  <Feather name="map-pin" size={18} color="#475569" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.gymCardName} numberOfLines={1}>
                    {topGym.name}
                    {topGym.branch ? ` ${topGym.branch}` : ''}
                  </Text>
                  <Text style={s.gymCardMeta}>
                    {topGym.visitCount}회 방문 · 최근 {formatShortDate(topGym.lastVisitDate)}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#cbd5e1" />
              </View>
            </Pressable>
          </>
        )}

        {/* Community latest (conditional) */}
        {latestPosts.length > 0 && (
          <>
            <SectionHeader
              title="커뮤니티 최신글"
              actionLabel="더보기"
              onAction={() => router.push('/(tabs)/community')}
            />
            <View style={s.communityList}>
              {latestPosts.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() =>
                    router.push({ pathname: '/community/[id]', params: { id: p.id } })
                  }
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={s.postRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {p.title ? (
                        <Text style={s.postRowTitle} numberOfLines={1}>
                          {p.title}
                        </Text>
                      ) : null}
                      <Text style={s.postRowBody} numberOfLines={2}>
                        {p.body}
                      </Text>
                      <Text style={s.postRowMeta}>
                        {p.author?.display_name ?? p.author?.username ?? '익명'}
                        {' · '}
                        {formatRelativeTime(p.created_at)}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#cbd5e1" />
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub components ──────────────────────────────────────────
function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={6}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <Text style={s.sectionAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function WeekMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}) {
  return (
    <View style={s.weekCol}>
      <Feather name={icon} size={14} color="#475569" />
      <Text style={s.weekValue}>{value}</Text>
      <Text style={s.weekLabel}>{label}</Text>
    </View>
  );
}

function WeekDivider() {
  return <View style={s.weekDivider} />;
}

function SessionRow({ session }: { session: RecentSession }) {
  const router = useRouter();
  const gymName = session.gym?.name ?? '암장 미선택';
  const branchName = session.gym?.branch ? ` ${session.gym.branch}` : '';
  const hasSends = session.send_count > 0;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={s.sessionRow}>
        <View style={s.sessionIcon}>
          <Feather name="map-pin" size={14} color="#475569" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.sessionName} numberOfLines={1}>
            {gymName}
            {branchName}
          </Text>
          <View style={s.sessionMetaRow}>
            <Text style={s.sessionMetaText}>{formatShortDate(session.session_date)}</Text>
            {session.duration_min != null && (
              <>
                <Text style={s.sessionMetaDot}>·</Text>
                <Text style={s.sessionMetaText}>{formatDuration(session.duration_min)}</Text>
              </>
            )}
          </View>
        </View>
        <View style={[s.sendBadge, !hasSends && s.sendBadgeMuted]}>
          <Text style={[s.sendBadgeText, !hasSends && s.sendBadgeTextMuted]}>
            완등 {session.send_count}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },

  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  greetingHello: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  greetingDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarBtnImage: { width: '100%', height: '100%' },
  avatarBtnChar: { fontSize: 17, fontWeight: '800', color: '#334155' },

  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  actionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#06b6d4',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  actionIconPrimary: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimaryTitle: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  actionPrimarySub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 1,
    fontWeight: '600',
  },
  actionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  actionIconSecondary: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSecondaryTitle: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  actionSecondarySub: { color: '#64748b', fontSize: 11, marginTop: 1, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2 },
  sectionAction: { fontSize: 12, fontWeight: '700', color: '#334155' },
  sectionLoader: { paddingVertical: 16, alignItems: 'center' },

  weekCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekValue: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  weekLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  weekDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#e2e8f0' },
  weekEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekEmptyText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  emptyCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  emptyCardText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  sessionList: { gap: 8 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sessionMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sessionMetaText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  sessionMetaDot: { fontSize: 11, color: '#cbd5e1', marginHorizontal: 2 },
  sendBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  sendBadgeMuted: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  sendBadgeText: { color: '#059669', fontSize: 12, fontWeight: '800' },
  sendBadgeTextMuted: { color: '#94a3b8' },

  gymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  gymCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymCardName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  gymCardMeta: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },

  communityList: { gap: 8 },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  postRowTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  postRowBody: { fontSize: 12, color: '#475569', lineHeight: 18 },
  postRowMeta: { fontSize: 10, fontWeight: '600', color: '#94a3b8', marginTop: 6 },
});
