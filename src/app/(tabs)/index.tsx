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

import { useCommunityFeed, type PostRow, POST_TYPE_LABEL, type PostType } from '@/hooks/use-community';
import { useHomeStats } from '@/hooks/use-home-stats';
import { useProfile } from '@/hooks/use-profile';
import { useRecentSessions } from '@/hooks/use-recent-sessions';
import { useUserStats } from '@/hooks/use-user-stats';
import { SessionRow } from '@/components/session/session-row';

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
      {/* Header & Greeting Section */}
      <View style={s.header}>
        <View style={s.greetingTextContainer}>
          <Text style={s.greetingTitle} numberOfLines={1}>
            안녕하세요, {username}님
          </Text>
          <View style={s.dateBadgeRow}>
            <Feather name="calendar" size={12} color="#06b6d4" />
            <Text style={s.dateText}>{formatTodayLong()}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={s.avatarWrapper}>
            {profileQ.data?.avatar_url ? (
              <Image
                source={{ uri: profileQ.data.avatar_url }}
                style={s.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarFallbackText}>
                  {(username[0] ?? '?').toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor="#06b6d4" />
        }
      >
        {/* Quick Action Tiles */}
        <View style={s.quickActionsContainer}>
          <Pressable
            onPress={() => router.push('/session/new')}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={[s.actionCard, s.actionCardPrimary]}>
              <View style={s.actionIconBgPrimary}>
                <Feather name="edit-3" size={18} color="#ffffff" />
              </View>
              <View style={s.actionTextContainer}>
                <Text style={s.actionTitlePrimary}>오늘 운동 기록</Text>
                <Text style={s.actionDescPrimary}>시도·완등 등록</Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/gyms')}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={[s.actionCard, s.actionCardSecondary]}>
              <View style={s.actionIconBgSecondary}>
                <Feather name="map-pin" size={18} color="#06b6d4" />
              </View>
              <View style={s.actionTextContainer}>
                <Text style={s.actionTitleSecondary}>암장 탐색</Text>
                <Text style={s.actionDescSecondary}>지점 및 정보 찾기</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Weekly Summary Dashboard Card */}
        <View style={s.dashboardCard}>
          <View style={s.dashboardCardHeader}>
            <View style={s.dashboardCardHeaderTitleRow}>
              <View style={s.dashboardCardIconWrap}>
                <Feather name="trending-up" size={14} color="#06b6d4" />
              </View>
              <Text style={s.dashboardCardTitle}>이번 주 등반 현황</Text>
            </View>
            <Text style={s.dashboardCardSubtitle}>월요일 기준 집계</Text>
          </View>

          {weekQ.isLoading ? (
            <View style={s.loaderWrap}>
              <ActivityIndicator color="#06b6d4" />
            </View>
          ) : weekQ.data && (weekQ.data.weeklySessions > 0 || weekQ.data.weeklySends > 0) ? (
            <View style={s.metricsGrid}>
              <View style={s.metricItem}>
                <Text style={s.metricLabel}>세션</Text>
                <Text style={[s.metricVal, { color: '#0f172a' }]}>
                  {weekQ.data.weeklySessions}
                  <Text style={s.metricUnit}> 회</Text>
                </Text>
              </View>
              <View style={s.metricGridDivider} />
              <View style={s.metricItem}>
                <Text style={s.metricLabel}>완등</Text>
                <Text style={[s.metricVal, { color: '#06b6d4' }]}>
                  {weekQ.data.weeklySends}
                  <Text style={s.metricUnit}> 개</Text>
                </Text>
              </View>
              <View style={s.metricGridDivider} />
              <View style={s.metricItem}>
                <Text style={s.metricLabel}>최고 난이도</Text>
                <Text style={[s.metricVal, { color: '#7c3aed' }]}>
                  {weekQ.data.maxVGrade ?? '-'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.dashboardEmpty}>
              <Feather name="target" size={24} color="#94a3b8" />
              <Text style={s.dashboardEmptyText}>이번 주에 아직 등반 기록이 없습니다.</Text>
              <Pressable
                onPress={() => router.push('/session/new')}
                style={({ pressed }) => [s.dashboardEmptyBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={s.dashboardEmptyBtnText}>첫 등반 등록하기</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Recent sessions */}
        <SectionHeader
          title="최근 세션"
          actionLabel="전체 보기"
          onAction={() => router.push('/(tabs)/log')}
        />
        {recentQ.isLoading ? (
          <View style={s.loaderWrap}>
            <ActivityIndicator color="#06b6d4" />
          </View>
        ) : recent.length === 0 ? (
          <View style={s.emptyCard}>
            <Feather name="activity" size={20} color="#94a3b8" />
            <Text style={s.emptyCardText}>아직 기록된 등반 세션이 없습니다</Text>
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
            <SectionHeader title="나의 단골 암장" />
            <Pressable
              onPress={() =>
                router.push({ pathname: '/gym/[id]', params: { id: topGym.gymId } })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={s.topGymCard}>
                <View style={s.topGymIconBg}>
                  <Feather name="heart" size={16} color="#06b6d4" fill="#06b6d4" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.topGymName} numberOfLines={1}>
                    {topGym.name}
                    {topGym.branch ? ` ${topGym.branch}` : ''}
                  </Text>
                  <View style={s.topGymMetaRow}>
                    <View style={s.topGymVisitTag}>
                      <Text style={s.topGymVisitTagText}>방문 {topGym.visitCount}회</Text>
                    </View>
                    <Text style={s.topGymLastVisitText}>
                      최근 {formatShortDate(topGym.lastVisitDate)}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#cbd5e1" />
              </View>
            </Pressable>
          </>
        )}

        {/* Community latest (conditional) */}
        {latestPosts.length > 0 && (
          <>
            <SectionHeader
              title="커뮤니티 인기 토크"
              actionLabel="전체 보기"
              onAction={() => router.push('/(tabs)/community')}
            />
            <View style={s.communityList}>
              {latestPosts.map((p) => {
                const authorName = p.author?.display_name ?? p.author?.username ?? '익명';
                const firstChar = authorName.length > 0 ? authorName.charAt(0).toUpperCase() : '?';
                return (
                  <Pressable
                    key={p.id}
                    onPress={() =>
                      router.push({ pathname: '/community/[id]', params: { id: p.id } })
                    }
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                  >
                    <View style={s.communityCard}>
                      <View style={s.communityCardHeader}>
                        <View style={s.communityAuthorRow}>
                          <View style={s.compactAvatar}>
                            {p.author?.avatar_url ? (
                              <Image
                                source={{ uri: p.author.avatar_url }}
                                style={s.compactAvatarImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text style={s.compactAvatarText}>{firstChar}</Text>
                            )}
                          </View>
                          <View>
                            <Text style={s.communityAuthorName} numberOfLines={1}>{authorName}</Text>
                            <Text style={s.communityTimeText}>{formatRelativeTime(p.created_at)}</Text>
                          </View>
                        </View>
                        <View style={s.communityBadge}>
                          <Text style={s.communityBadgeText}>
                            {p.post_type === 'meetup' ? '모임' : POST_TYPE_LABEL[p.post_type as Exclude<PostType, 'meetup'>] ?? '자유'}
                          </Text>
                        </View>
                      </View>

                      {p.title ? (
                        <Text style={s.communityCardTitle} numberOfLines={1}>
                          {p.title}
                        </Text>
                      ) : null}
                      <Text style={s.communityCardBody} numberOfLines={2}>
                        {p.body}
                      </Text>

                      <View style={s.communityCardFooter}>
                        <View style={s.communityMetrics}>
                          <View style={s.communityMetricItem}>
                            <Feather name="heart" size={12} color="#94a3b8" />
                            <Text style={s.communityMetricCount}>{p.like_count}</Text>
                          </View>
                          <View style={s.communityMetricItem}>
                            <Feather name="message-circle" size={12} color="#94a3b8" />
                            <Text style={s.communityMetricCount}>{p.comment_count}</Text>
                          </View>
                        </View>
                        <Feather name="chevron-right" size={14} color="#cbd5e1" />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
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



// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // Header & Greeting Section
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  greetingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  dateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#cffafe',
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0e7490',
  },

  // Quick Action Tiles
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionCardPrimary: {
    backgroundColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionCardSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionIconBgPrimary: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionIconBgSecondary: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitlePrimary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  actionDescPrimary: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  actionTitleSecondary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionDescSecondary: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },

  // Weekly Summary Dashboard Card
  dashboardCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  dashboardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dashboardCardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashboardCardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  dashboardCardSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  metricVal: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  metricGridDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#f1f5f9',
  },
  dashboardEmpty: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dashboardEmptyText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 14,
  },
  dashboardEmptyBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dashboardEmptyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06b6d4',
  },
  loaderWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // General empty card
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  emptyCardText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },

  // Session Cards
  sessionList: {
    gap: 10,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  sessionDateBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionDateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  sessionDateDay: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
  },
  sessionInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  sessionGymName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  sessionMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  sessionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 4,
  },
  sessionBadgeActive: {
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
  },
  sessionBadgeMuted: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sessionBadgeTextActive: {
    color: '#0e7490',
  },
  sessionBadgeTextMuted: {
    color: '#94a3b8',
  },
  chevronRight: {
    marginLeft: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },

  // Top Gym Card
  topGymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  topGymIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topGymName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  topGymMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  topGymVisitTag: {
    backgroundColor: '#cffafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topGymVisitTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0e7490',
  },
  topGymLastVisitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },

  // Community List & Cards
  communityList: {
    gap: 10,
  },
  communityCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  communityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  communityAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  compactAvatarImage: {
    width: '100%',
    height: '100%',
  },
  compactAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369a1',
  },
  communityAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 120,
  },
  communityTimeText: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 1,
  },
  communityBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  communityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  communityCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  communityCardBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  communityCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  communityMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  communityMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  communityMetricCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
});
