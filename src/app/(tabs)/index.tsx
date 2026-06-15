import { useRouter } from '@/lib/router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useMyBattles, type Battle, type BattleStatus } from '@/hooks/use-battles';
import { useCommunityFeed, useMyJoinedMeetups, type PostRow, POST_TYPE_LABEL, type PostType } from '@/hooks/use-community';
import { useFavoriteGyms } from '@/hooks/use-favorites';
import { useHomeStats } from '@/hooks/use-home-stats';
import { useProfile } from '@/hooks/use-profile';
import { useRecentSessions } from '@/hooks/use-recent-sessions';
import { useUserStats } from '@/hooks/use-user-stats';
import { GymThumbnail } from '@/components/gym/gym-thumbnail';
import { SessionRow } from '@/components/session/session-row';
import { EmptyState } from '@/components/ui/empty-state';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

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
  const s = useMemo(() => makeStyles(c), [c]);
  const profileQ = useProfile();
  const weekQ = useHomeStats();
  const recentQ = useRecentSessions(3);
  const userStatsQ = useUserStats();
  const feedQ = useCommunityFeed('all');
  const favGymsQ = useFavoriteGyms();
  const myBattlesQ = useMyBattles();
  const myMeetupsQ = useMyJoinedMeetups();

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
    favGymsQ.isRefetching ||
    myBattlesQ.isRefetching ||
    myMeetupsQ.isRefetching;

  function refetchAll() {
    weekQ.refetch();
    recentQ.refetch();
    userStatsQ.refetch();
    feedQ.refetch();
    profileQ.refetch();
    favGymsQ.refetch();
    myBattlesQ.refetch();
    myMeetupsQ.refetch();
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
          style={({ pressed }) => [pressed && s.recordBannerPressed]}
        >
          <View style={s.recordBannerCard}>
            <View style={s.recordBannerOverlay} />
            <View style={s.recordBannerLeft}>
              <Text style={s.recordBannerTitle}>오늘의 등반 기록</Text>
              <Text style={s.recordBannerSubtitle}>
                색깔별 시도와 결과를 한 화면에서
              </Text>
            </View>
            <View style={s.recordBannerCTA}>
              <Text style={s.recordBannerCTAText}>기록</Text>
              <Feather name="arrow-right" size={14} color={c.brand.primaryDeep} />
            </View>
          </View>
        </Pressable>

        {/* Weekly Summary Dashboard Card */}
        <View style={s.dashboardCard}>
          <View style={s.dashboardCardHeader}>
            <Text style={s.sectionLabelText}>이번 주</Text>
            <Text style={s.dashboardCardSubtitle}>월요일 기준</Text>
          </View>

          {weekQ.isLoading ? (
            <View style={s.loaderWrap}>
              <ActivityIndicator color={c.brand.primary} />
            </View>
          ) : weekQ.data && (weekQ.data.weeklySessions > 0 || weekQ.data.weeklySends > 0) ? (
            <View style={s.metricsGrid}>
              <HomeMetric icon="calendar" accent="#2563eb" value={weekQ.data.weeklySessions} label="세션" />
              <View style={s.metricGridDivider} />
              <HomeMetric icon="check-circle" accent="#16a34a" value={weekQ.data.weeklySends} label="완등" />
              <View style={s.metricGridDivider} />
              <HomeMetric icon="award" accent="#7c3aed" value={weekQ.data.maxVGrade ?? '-'} label="최고" />
            </View>
          ) : (
            <EmptyState
              compact
              icon="target"
              tone="muted"
              title="이번 주 등반 기록이 없어요"
              action={{
                label: '첫 등반 기록',
                icon: 'edit-3',
                onPress: () => router.push('/session/new'),
              }}
            />
          )}
        </View>

        {/* Upcoming Events (D-day) */}
        <UpcomingEventsSection />

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
            <SectionHeader title="단골 암장" />
            <Pressable
              onPress={() =>
                router.push({ pathname: '/gym/[id]', params: { id: topGym.gymId } })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={s.topGymCard}>
                <GymThumbnail
                  name={topGym.name}
                  branch={topGym.branch ?? null}
                  size={48}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.topGymName} numberOfLines={1}>
                    {topGym.name}
                    {topGym.branch ? <Text style={s.topGymBranch}> {topGym.branch}</Text> : null}
                  </Text>
                  <View style={s.topGymMetaRow}>
                    <View style={s.topGymVisitTag}>
                      <Feather name="repeat" size={9} color={c.brand.primaryDeep} />
                      <Text style={s.topGymVisitTagText}>{topGym.visitCount}회</Text>
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
                          <UserAvatar
                            userKey={p.author?.id ?? p.author?.username ?? p.id}
                            username={authorName}
                            avatarUrl={p.author?.avatar_url}
                            size={32}
                          />
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
                          <View style={s.communityMetricChip}>
                            <Ionicons name="heart-outline" size={14} color={c.text.tertiary} />
                            <Text style={s.communityMetricCount}>{p.like_count}</Text>
                          </View>
                          <View style={s.communityMetricChip}>
                            <Feather name="message-circle" size={13} color={c.text.tertiary} />
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

type UpcomingEventItem = {
  kind: 'battle' | 'meetup';
  id: string;
  title: string;
  date: Date;
  dday: number;
  status: BattleStatus | 'upcoming';
  badge: string;
  badgeAccent: string;
  crew: string | null;
};

function buildEventBadge(b: Battle): { badge: string; accent: string } {
  return { badge: '크루 대결', accent: '#ef4444' };
}

function UpcomingEventsSection() {
  const router = useRouter();
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const battlesQ = useMyBattles();
  const meetupsQ = useMyJoinedMeetups();

  const events = useMemo<UpcomingEventItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = Date.now();
    const result: UpcomingEventItem[] = [];

    for (const b of battlesQ.data ?? []) {
      if (b.status === 'ended' || b.status === 'declined') continue;
      const d = new Date(`${b.battle_date}T00:00:00`);
      if (b.status !== 'active' && d < today) continue;
      const dday = Math.ceil((d.getTime() - today.getTime()) / 86400000);
      const { badge, accent } = buildEventBadge(b);
      result.push({
        kind: 'battle',
        id: b.id,
        title: b.title,
        date: d,
        dday,
        status: b.status,
        badge,
        badgeAccent: accent,
        crew: b.crew?.name ?? null,
      });
    }

    for (const m of meetupsQ.data ?? []) {
      if (!m.meetup_at) continue;
      const d = new Date(m.meetup_at);
      if (d.getTime() < now) continue;
      const meetupDay = new Date(d);
      meetupDay.setHours(0, 0, 0, 0);
      const dday = Math.ceil((meetupDay.getTime() - today.getTime()) / 86400000);
      result.push({
        kind: 'meetup',
        id: m.id,
        title: m.title ?? m.body.slice(0, 30),
        date: d,
        dday,
        status: 'upcoming',
        badge: m.crew_id ? '크루 모임' : '모임',
        badgeAccent: m.crew_id ? '#7c3aed' : c.brand.primaryDeep,
        crew: null,
      });
    }

    result.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return a.date.getTime() - b.date.getTime();
    });
    return result.slice(0, 3);
  }, [battlesQ.data, meetupsQ.data, c.brand.primaryDeep]);

  if (!events.length) return null;

  return (
    <>
      <SectionHeader
        title="다가오는 일정"
        actionLabel="전체 보기"
        onAction={() => router.push('/profile/community')}
      />
      <View style={s.eventsList}>
        {events.map((ev) => (
          <Pressable
            key={`${ev.kind}-${ev.id}`}
            onPress={() =>
              router.push(
                ev.kind === 'battle'
                  ? { pathname: '/battle/[id]', params: { id: ev.id } }
                  : { pathname: '/community/[id]', params: { id: ev.id } },
              )
            }
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={s.eventCard}>
              <View style={[s.eventBadge, { backgroundColor: ev.badgeAccent + '22' }]}>
                <Text style={[s.eventBadgeText, { color: ev.badgeAccent }]}>{ev.badge}</Text>
              </View>
              <View style={s.eventInfo}>
                <Text style={s.eventTitle} numberOfLines={1}>{ev.title}</Text>
                {ev.crew && (
                  <Text style={s.eventCrew} numberOfLines={1}>{ev.crew}</Text>
                )}
              </View>
              {ev.status === 'active' ? (
                <View style={[s.ddayChip, { backgroundColor: '#16a34a' }]}>
                  <Text style={s.ddayText}>진행 중</Text>
                </View>
              ) : (
                <View style={s.ddayChip}>
                  <Text style={s.ddayText}>
                    {ev.dday === 0 ? 'D-Day' : `D-${ev.dday}`}
                  </Text>
                </View>
              )}
              <Feather name="chevron-right" size={14} color={c.border.strong} />
            </View>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function FavoriteGymsSection() {
  const router = useRouter();
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: favorites, isLoading } = useFavoriteGyms();

  if (isLoading) {
    return (
      <View style={s.favLoaderWrap}>
        <ActivityIndicator color={c.brand.primary} />
      </View>
    );
  }

  return (
    <View>
      <SectionHeader
        title="즐겨찾는 암장"
        actionLabel="더보기"
        onAction={() => router.push('/(tabs)/gyms')}
      />

      {!favorites || favorites.length === 0 ? (
        <Pressable
          onPress={() => router.push('/(tabs)/gyms')}
          style={({ pressed }) => [s.favEmptyCard, pressed && { opacity: 0.9 }]}
        >
          <MaterialCommunityIcons name="star-outline" size={18} color={c.text.muted} />
          <View style={s.favEmptyTextContainer}>
            <Text style={s.favEmptyTitle}>자주 가는 암장을 등록해보세요</Text>
            <Text style={s.favEmptySubtitle}>암장 탐색에서 별표(★)를 누르면 추가</Text>
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
                  <GymThumbnail
                    name={gym.name}
                    branch={gym.branch ?? null}
                    logoUrl={gym.logo_url}
                    logoBgHex={gym.logo_bg_hex}
                    size={44}
                  />
                  <Text style={s.favGymName} numberOfLines={1}>
                    {gym.name}
                  </Text>
                  <Text style={s.favGymBranch} numberOfLines={1}>
                    {gym.branch || gym.city}
                  </Text>
                  <View style={s.favGymTags}>
                    {gym.has_boulder && (
                      <View style={s.favGymTag}>
                        <Text style={s.favGymTagText}>볼더</Text>
                      </View>
                    )}
                    {gym.has_lead && (
                      <View style={s.favGymTag}>
                        <Text style={s.favGymTagText}>리드</Text>
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
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={6}>
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                opacity: pressed ? 0.5 : 1,
              }}
            >
              <Text style={s.sectionAction} numberOfLines={1}>{actionLabel}</Text>
              <Feather
                name="chevron-right"
                size={14}
                color={c.text.secondary}
                style={{ marginLeft: 2 }}
              />
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

function HomeMetric({
  icon,
  accent,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  accent: string;
  value: number | string;
  label: string;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.metricItem}>
      <View style={[s.metricIconBox, { backgroundColor: `${accent}15` }]}>
        <Feather name={icon} size={15} color={accent} />
      </View>
      <Text style={[s.metricVal, { color: c.text.primary }]}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  recordBannerPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  recordBannerCard: {
    backgroundColor: c.brand.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: c.brand.primary,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  recordBannerOverlay: {
    position: 'absolute',
    right: -40,
    top: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: c.brand.onPrimary + '1f',
  },
  recordBannerLeft: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  recordBannerTitle: {
    color: c.brand.onPrimary,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  recordBannerSubtitle: {
    color: c.brand.onPrimary + 'd1',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  recordBannerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: c.brand.onPrimary,
  },
  recordBannerCTAText: {
    color: c.brand.primaryDeep,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  // Weekly Summary Dashboard Card
  dashboardCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 12,
  },
  dashboardCardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '900',
    color: c.text.tertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  dashboardCardSubtitle: {
    fontSize: 10,
    fontWeight: '700',
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
    gap: 4,
  },
  metricIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.muted,
  },
  metricVal: {
    fontSize: 22,
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
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: -4,    // 카드 자체 paddingTop(14)이 추가 호흡을 만들어줌 — 음수로 보정
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
    color: c.text.secondary,
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
    gap: 12,
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 14,
  },
  topGymName: {
    fontSize: 15,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.3,
  },
  topGymBranch: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.secondary,
  },
  topGymMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  topGymVisitTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.bg.accent,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  topGymVisitTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: c.brand.primaryDeep,
  },
  topGymLastVisitText: {
    fontSize: 10.5,
    fontWeight: '700',
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
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  communityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: c.bg.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  communityBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: c.brand.primaryDeep,
    letterSpacing: 0.2,
  },
  communityCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  communityCardBody: {
    fontSize: 12.5,
    color: c.text.secondary,
    lineHeight: 18,
  },
  communityCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border.subtle,
  },
  communityMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  communityMetricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: c.bg.subtle,
  },
  communityMetricCount: {
    fontSize: 11,
    fontWeight: '800',
    color: c.text.secondary,
  },

  // Upcoming Events
  eventsList: {
    gap: 8,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.2,
  },
  eventCrew: {
    fontSize: 11,
    fontWeight: '600',
    color: c.text.tertiary,
  },
  ddayChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: c.brand.primary,
  },
  ddayText: {
    fontSize: 11,
    fontWeight: '900',
    color: c.brand.onPrimary,
  },

  // Favorite Gyms Styles
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
    paddingTop: 16,        // sectionHeader 음수 marginBottom 보정 + 카드와 시각적 거리 통일
    gap: 10,
  },
  favGymCard: {
    width: 148,
    minHeight: 150,
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  favGymName: {
    fontSize: 14,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.3,
    marginTop: 8,
  },
  favGymBranch: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.tertiary,
    marginBottom: 6,
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
    borderRadius: 999,
  },
  favGymTagText: {
    fontSize: 9.5,
    fontWeight: '800',
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
