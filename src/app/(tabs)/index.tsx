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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useCommunityFeed, type PostRow, POST_TYPE_LABEL, type PostType } from '@/hooks/use-community';
import { useFavoriteGyms } from '@/hooks/use-favorites';
import { useHomeStats } from '@/hooks/use-home-stats';
import { useProfile } from '@/hooks/use-profile';
import { useRecentSessions } from '@/hooks/use-recent-sessions';
import { useUserStats } from '@/hooks/use-user-stats';
import { SessionRow } from '@/components/session/session-row';
import { EmptyState } from '@/components/ui/empty-state';
import { useThemeColors, useEffectiveScheme, type ThemeColors } from '@/lib/theme';

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
  const c = useThemeColors();
  const isDark = useEffectiveScheme() === 'dark';
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const profileQ = useProfile();
  const weekQ = useHomeStats();
  const recentQ = useRecentSessions(3);
  const userStatsQ = useUserStats();
  const feedQ = useCommunityFeed('all');
  const favGymsQ = useFavoriteGyms();

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
    feedQ.isRefetching ||
    favGymsQ.isRefetching;

  function refetchAll() {
    weekQ.refetch();
    recentQ.refetch();
    userStatsQ.refetch();
    feedQ.refetch();
    profileQ.refetch();
    favGymsQ.refetch();
  }

  const insets = useSafeAreaInsets();

  return (
    <View style={s.container}>
      {/* Header & Greeting — normal flex flow, no absolute positioning */}
      <View style={[s.headerWrap, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={s.header}>
          <View style={s.greetingTextContainer}>
            <Text style={s.greetingTitle} numberOfLines={1}>
              안녕하세요, {username}님
            </Text>
            <View style={s.dateBadgeRow}>
              <Feather name="calendar" size={12} color={c.brand.primary} />
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
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg.primary }}
        contentContainerStyle={s.scrollContent}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={c.brand.primary} />
        }
      >
        {/* Record Session Banner */}
        <Pressable
          onPress={() => router.push('/session/new')}
          style={({ pressed }) => [
            s.recordBannerPressable,
            pressed && s.recordBannerPressed
          ]}
        >
          <View style={s.recordBannerCard}>
            {/* Decorative background shape */}
            <View style={s.recordBannerOverlay} />
            
            <View style={s.recordBannerLeft}>
              <View style={s.recordBadge}>
                <Text style={s.recordBadgeText}>RECORD</Text>
              </View>
              <Text style={s.recordBannerTitle}>오늘의 등반 기록하기</Text>
              <Text style={s.recordBannerSubtitle}>
                세션 시간, 완등 개수, 최고 난이도를 간편하게 기록하세요
              </Text>
            </View>
            
            <View style={s.recordBannerRight}>
              <View style={s.recordBannerButton}>
                <Feather name="plus" size={18} color="#ffffff" />
              </View>
            </View>
          </View>
        </Pressable>

        {/* Weekly Summary Dashboard Card */}
        <View style={s.dashboardCard}>
          <View style={s.dashboardCardHeader}>
            <View style={s.dashboardCardHeaderTitleRow}>
              <View style={s.dashboardCardIconWrap}>
                <Feather name="trending-up" size={14} color={c.brand.primary} />
              </View>
              <Text style={s.dashboardCardTitle}>이번 주 등반 현황</Text>
            </View>
            <Text style={s.dashboardCardSubtitle}>월요일 기준 집계</Text>
          </View>

          {weekQ.isLoading ? (
            <View style={s.loaderWrap}>
              <ActivityIndicator color={c.brand.primary} />
            </View>
          ) : weekQ.data && (weekQ.data.weeklySessions > 0 || weekQ.data.weeklySends > 0) ? (
            <View style={s.metricsGrid}>
              <View style={s.metricItem}>
                <Text style={s.metricLabel}>세션</Text>
                <Text style={[s.metricVal, { color: c.text.primary }]}>
                  {weekQ.data.weeklySessions}
                  <Text style={s.metricUnit}> 회</Text>
                </Text>
              </View>
              <View style={s.metricGridDivider} />
              <View style={s.metricItem}>
                <Text style={s.metricLabel}>완등</Text>
                <Text style={[s.metricVal, { color: c.brand.primary }]}>
                  {weekQ.data.weeklySends}
                  <Text style={s.metricUnit}> 개</Text>
                </Text>
              </View>
              <View style={s.metricGridDivider} />
              <View style={s.metricItem}>
                <Text style={s.metricLabel}>최고 난이도</Text>
                <Text style={[s.metricVal, { color: isDark ? '#a78bfa' : '#7c3aed' }]}>
                  {weekQ.data.maxVGrade ?? '-'}
                </Text>
              </View>
            </View>
          ) : (
            <EmptyState
              compact
              icon="target"
              tone="muted"
              title="이번 주에 아직 등반 기록이 없습니다"
              action={{
                label: '첫 등반 등록하기',
                icon: 'edit-3',
                onPress: () => router.push('/session/new'),
              }}
            />
          )}
        </View>

        {/* Favorite Gyms Section */}
        <FavoriteGymsSection />

        {/* Recent sessions */}
        <SectionHeader
          title="최근 세션"
          actionLabel="전체 보기"
          onAction={() => router.push('/(tabs)/log')}
        />
        {recentQ.isLoading ? (
          <View style={s.loaderWrap}>
            <ActivityIndicator color={c.brand.primary} />
          </View>
        ) : recent.length === 0 ? (
          <EmptyState
            compact
            icon="activity"
            tone="muted"
            title="아직 기록된 등반 세션이 없습니다"
          />
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
                  <Feather name="heart" size={16} color={c.brand.primary} fill={c.brand.primary} />
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
                <Feather name="chevron-right" size={16} color={c.border.strong} />
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
                            <Feather name="heart" size={12} color={c.text.muted} />
                            <Text style={s.communityMetricCount}>{p.like_count}</Text>
                          </View>
                          <View style={s.communityMetricItem}>
                            <Feather name="message-circle" size={12} color={c.text.muted} />
                            <Text style={s.communityMetricCount}>{p.comment_count}</Text>
                          </View>
                        </View>
                        <Feather name="chevron-right" size={14} color={c.border.strong} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub components ──────────────────────────────────────────
function FavoriteGymsSection() {
  const router = useRouter();
  const c = useThemeColors();
  const isDark = useEffectiveScheme() === 'dark';
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
  const { data: favorites, isLoading } = useFavoriteGyms();

  if (isLoading) {
    return (
      <View style={s.favLoaderWrap}>
        <ActivityIndicator color={c.brand.primary} />
      </View>
    );
  }

  return (
    <View style={s.favSection}>
      <View style={s.favHeaderRow}>
        <Text style={s.favSectionTitle}>즐겨찾는 암장</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/gyms')}
          hitSlop={6}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <Text style={s.favHeaderAction}>암장 더보기</Text>
        </Pressable>
      </View>

      {!favorites || favorites.length === 0 ? (
        <Pressable
          onPress={() => router.push('/(tabs)/gyms')}
          style={({ pressed }) => [s.favEmptyCard, pressed && { opacity: 0.9 }]}
        >
          <Feather name="star" size={20} color={c.text.muted} />
          <View style={s.favEmptyTextContainer}>
            <Text style={s.favEmptyTitle}>자주 가는 암장을 등록해 보세요</Text>
            <Text style={s.favEmptySubtitle}>암장 탐색에서 별표(★)를 누르면 추가됩니다</Text>
          </View>
          <Feather name="chevron-right" size={16} color={c.border.strong} />
        </Pressable>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.favScrollContent}
        >
          {favorites.map((gym) => (
            <Pressable
              key={gym.id}
              onPress={() =>
                router.push({ pathname: '/gym/[id]', params: { id: gym.id } })
              }
            >
              {({ pressed }) => (
                <View
                  style={[
                    s.favGymCard,
                    pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }
                  ]}
                >
                  <View style={s.favGymHeader}>
                    <Text style={s.favGymLocation} numberOfLines={1}>
                      {gym.city} {gym.district ?? ''}
                    </Text>
                    <MaterialCommunityIcons name="star" size={15} color={c.status.warning} />
                  </View>

                  <Text style={s.favGymName} numberOfLines={1}>
                    {gym.name}
                  </Text>
                  
                  <Text style={s.favGymBranch} numberOfLines={1}>
                    {gym.branch || '본점'}
                  </Text>

                  <View style={s.favGymTags}>
                    {gym.has_boulder && (
                      <View style={s.favGymTag}>
                        <Text style={s.favGymTagText}>볼더링</Text>
                      </View>
                    )}
                    {gym.has_kilter && (
                      <View style={[s.favGymTag, s.favGymTagAccent]}>
                        <Text style={[s.favGymTagText, s.favGymTagTextAccent]}>킬터</Text>
                      </View>
                    )}
                    {gym.has_moonboard && (
                      <View style={[s.favGymTag, s.favGymTagAccent]}>
                        <Text style={[s.favGymTagText, s.favGymTagTextAccent]}>문보드</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const c = useThemeColors();
  const isDark = useEffectiveScheme() === 'dark';
  const s = useMemo(() => makeStyles(c, isDark), [c, isDark]);
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
function makeStyles(c: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 16,
  },

  // Header & Greeting Section
  headerWrap: {
    backgroundColor: c.bg.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  greetingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: c.text.primary,
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
    color: c.text.tertiary,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: c.bg.card,
    backgroundColor: c.bg.subtle,
    shadowColor: c.shadow.color,
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
    backgroundColor: c.bg.accent,
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '800',
    color: c.brand.primaryDeep,
  },

  // Record Session Banner Styles
  recordBannerPressable: {
    width: '100%',
  },
  recordBannerPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  recordBannerCard: {
    backgroundColor: isDark ? '#1e293b' : '#0f172a',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: c.shadow.color,
    shadowOpacity: c.shadow.opacity,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  recordBannerOverlay: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  recordBannerLeft: {
    flex: 1,
    marginRight: 12,
    gap: 6,
  },
  recordBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  recordBadgeText: {
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  recordBannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  recordBannerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  recordBannerRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordBannerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: c.shadow.color,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Weekly Summary Dashboard Card
  dashboardCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 24,
    padding: 20,
    shadowColor: c.shadow.color,
    shadowOpacity: c.shadow.opacity,
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
    backgroundColor: c.bg.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.2,
  },
  dashboardCardSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: c.text.muted,
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
    color: c.text.tertiary,
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
    color: c.text.muted,
  },
  metricGridDivider: {
    width: 1,
    height: 36,
    backgroundColor: c.bg.subtle,
  },
  dashboardEmpty: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dashboardEmptyText: {
    fontSize: 13,
    color: c.text.tertiary,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 14,
  },
  dashboardEmptyBtn: {
    backgroundColor: c.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dashboardEmptyBtnText: {
    color: c.brand.onPrimary,
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
    color: c.text.primary,
    letterSpacing: -0.2,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: c.brand.primary,
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
    borderColor: c.border.strong,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.card,
    gap: 8,
  },
  emptyCardText: {
    fontSize: 13,
    color: c.text.tertiary,
    fontWeight: '600',
  },

  // Session Cards
  sessionList: {
    gap: 10,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 14,
    shadowColor: c.shadow.color,
    shadowOpacity: c.shadow.opacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  sessionDateBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionDateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: c.text.tertiary,
  },
  sessionDateDay: {
    fontSize: 16,
    fontWeight: '900',
    color: c.text.primary,
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
    color: c.text.primary,
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
    color: c.text.tertiary,
  },
  sessionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 4,
  },
  sessionBadgeActive: {
    backgroundColor: c.bg.accent,
    borderColor: c.brand.primaryLight,
  },
  sessionBadgeMuted: {
    backgroundColor: c.bg.primary,
    borderColor: c.border.subtle,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sessionBadgeTextActive: {
    color: c.brand.primaryDeep,
  },
  sessionBadgeTextMuted: {
    color: c.text.muted,
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
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 16,
    shadowColor: c.shadow.color,
    shadowOpacity: c.shadow.opacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  topGymIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.bg.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topGymName: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
  },
  topGymMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  topGymVisitTag: {
    backgroundColor: c.bg.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topGymVisitTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: c.brand.primaryDeep,
  },
  topGymLastVisitText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.text.tertiary,
  },

  // Community List & Cards
  communityList: {
    gap: 10,
  },
  communityCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 16,
    shadowColor: c.shadow.color,
    shadowOpacity: c.shadow.opacity,
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
    backgroundColor: c.bg.accent,
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
    color: c.brand.primaryDeep,
  },
  communityAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.primary,
    maxWidth: 120,
  },
  communityTimeText: {
    fontSize: 9,
    color: c.text.muted,
    marginTop: 1,
  },
  communityBadge: {
    backgroundColor: c.bg.subtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border.subtle,
  },
  communityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: c.text.secondary,
  },
  communityCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
    marginBottom: 6,
  },
  communityCardBody: {
    fontSize: 12,
    color: c.text.secondary,
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
    color: c.text.tertiary,
  },

  // Favorite Gyms Styles
  favSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  favHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  favSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.2,
  },
  favHeaderAction: {
    fontSize: 12,
    fontWeight: '700',
    color: c.brand.primary,
  },
  favLoaderWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  favEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: c.shadow.color,
    shadowOpacity: c.shadow.opacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  favEmptyTextContainer: {
    flex: 1,
    gap: 2,
  },
  favEmptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.text.secondary,
  },
  favEmptySubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: c.text.muted,
  },
  favScrollContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 10,
  },
  favGymCard: {
    width: 155,
    minHeight: 132,
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 14,
    shadowColor: c.shadow.color,
    shadowOpacity: c.shadow.opacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  favGymHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  favGymLocation: {
    fontSize: 10,
    fontWeight: '700',
    color: c.text.muted,
    flex: 1,
    marginRight: 4,
  },
  favGymName: {
    fontSize: 15,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.3,
  },
  favGymBranch: {
    fontSize: 12,
    fontWeight: '600',
    color: c.text.tertiary,
    marginTop: 2,
    marginBottom: 10,
  },
  favGymTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 'auto',
  },
  favGymTag: {
    backgroundColor: c.bg.subtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  favGymTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: c.text.tertiary,
  },
  favGymTagAccent: {
    backgroundColor: c.bg.accent,
  },
  favGymTagTextAccent: {
    color: c.brand.primaryDeep,
  },
  });
}
