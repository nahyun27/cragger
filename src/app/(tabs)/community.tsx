import { useRouter } from '@/lib/router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

import {
  POST_TYPE_LABEL,
  useCommunityFeed,
  useMyLikes,
  useToggleLike,
  type PostRow,
  type PostType,
} from '@/hooks/use-community';
import { useDiscoverCrews, type CrewSummary } from '@/hooks/use-crews';
import { FeaturedBadgeChip } from '@/components/ui/featured-badge-chip';
import { EmptyState } from '@/components/ui/empty-state';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type FilterKey = 'all' | PostType;

const FILTER_TABS: {
  key: FilterKey;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  accent: string;
}[] = [
  { key: 'all', label: '전체', icon: 'layers', accent: '#06b6d4' },
  { key: 'general', label: POST_TYPE_LABEL.general, icon: 'message-circle', accent: '#2563eb' },
  { key: 'question', label: POST_TYPE_LABEL.question, icon: 'help-circle', accent: '#7c3aed' },
  { key: 'review', label: POST_TYPE_LABEL.review, icon: 'star', accent: '#059669' },
  { key: 'meetup', label: POST_TYPE_LABEL.meetup, icon: 'calendar', accent: '#d97706' },
];

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  general: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  question: { bg: 'rgba(147, 51, 234, 0.15)', text: '#a855f7', border: 'rgba(147, 51, 234, 0.3)' },
  review: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  meetup: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
};

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

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 모임 일시·장소·정원 + 상태 라벨. 미입력 필드는 placeholder 텍스트.
// 상태 색은 모임 상세 카드(community/[id]/index.tsx MeetupInfoCard)와 같은 톤 매핑을 사용.
function describeMeetup(post: PostRow, c: ThemeColors): {
  when: string;
  where: string | null;
  capacity: string;
  statusLabel: string | null;
  statusColor: { backgroundColor: string };
  statusTextColor: { color: string };
} {
  let when = '날짜 미정';
  let statusLabel: string | null = null;
  let statusBg = c.status.warningBg;
  let statusFg = c.status.warning;
  if (post.meetup_at) {
    const d = new Date(post.meetup_at);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const w = KO_WEEKDAYS[d.getDay()];
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    when = `${mm}.${dd}(${w}) ${hh}:${mi}`;
    const hoursLeft = (d.getTime() - Date.now()) / 3_600_000;
    if (hoursLeft < 0) {
      statusLabel = '종료';
      statusBg = c.bg.subtle;
      statusFg = c.text.tertiary;
    } else if (hoursLeft < 48) {
      statusLabel = '곧 시작';
      statusBg = c.status.dangerBg;
      statusFg = c.status.danger;
    }
  }
  const where = post.gym
    ? `${post.gym.name}${post.gym.branch ? ` ${post.gym.branch}` : ''}`
    : post.meetup_location;
  const cap = post.meetup_capacity;
  const capacity = cap != null
    ? `${post.participant_count} / ${cap}명`
    : `정원 무제한 (${post.participant_count}명)`;
  if (statusLabel == null && cap != null && post.participant_count >= cap) {
    statusLabel = '마감';
    statusBg = c.bg.subtle;
    statusFg = c.text.tertiary;
  }
  return {
    when,
    where,
    capacity,
    statusLabel,
    statusColor: { backgroundColor: statusBg },
    statusTextColor: { color: statusFg },
  };
}

// ── 크루 둘러보기 가로 스크롤 (모집 + 최근) ─────────────────────
function RecruitingCrewsStrip() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data } = useDiscoverCrews(10);
  if (!data || data.length === 0) return null;
  const hasAnyRecruiting = data.some((d) => d.is_recruiting);
  const recruitingCount = data.filter((d) => d.is_recruiting).length;
  return (
    <View style={s.recruitStrip}>
      {/* 위 → 아래로 흰색 → 페이지 배경(gray) 로 자연스럽게 fade */}
      <LinearGradient
        colors={[c.bg.card, c.bg.primary]}
        locations={[0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.recruitStripHeader}>
        <View style={s.recruitStripTitleRow}>
          <View style={s.recruitStripIcon}>
            <Feather name="users" size={13} color={c.brand.primaryDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.recruitStripTitle}>
              {hasAnyRecruiting ? '모집 중 크루' : '새로 생긴 크루'}
            </Text>
            <Text style={s.recruitStripSub}>
              {hasAnyRecruiting
                ? `지금 ${recruitingCount}개 크루가 가입 받고 있어요`
                : '최근 등록된 크루들을 살펴보세요'}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/crews/explore' as never)} hitSlop={6}>
          {({ pressed }) => (
            <View style={[s.recruitStripMore, pressed && { opacity: 0.6 }]}>
              <Text style={s.recruitStripMoreText}>전체</Text>
              <Feather name="chevron-right" size={12} color={c.brand.primary} />
            </View>
          )}
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.recruitScroll}
      >
        {data.map((crew) => (
          <RecruitingCrewMiniCard key={crew.id} crew={crew} />
        ))}
      </ScrollView>
    </View>
  );
}

function RecruitingCrewMiniCard({ crew }: { crew: CrewSummary }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const firstChar = crew.name.length > 0 ? crew.name.charAt(0).toUpperCase() : '?';
  // 7일 이내 생성된 크루는 NEW 뱃지
  const ageDays = (Date.now() - new Date(crew.created_at).getTime()) / 86_400_000;
  const isNew = ageDays < 7;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/crew/[id]', params: { id: crew.id } } as never)}
      style={({ pressed }) => [s.recruitCard, pressed && { opacity: 0.85 }]}
    >
      <View style={{ position: 'relative' }}>
        <View style={[s.recruitCardAvatar, { overflow: 'hidden' }]}>
          {crew.image_url ? (
            <Image source={{ uri: crew.image_url }} style={s.recruitCardAvatarImg} />
          ) : (
            <Text style={s.recruitCardAvatarText}>{firstChar}</Text>
          )}
        </View>
        {isNew && (
          <View style={s.newBadge}>
            <Text style={s.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
      <Text style={s.recruitCardName} numberOfLines={1}>{crew.name}</Text>
      <Text style={s.recruitCardMeta} numberOfLines={1}>
        {[crew.region, `${crew.member_count}명`].filter(Boolean).join(' · ')}
      </Text>
      {crew.is_recruiting && (
        <View style={s.recruitingChip}>
          <Text style={s.recruitingChipText}>모집중</Text>
        </View>
      )}
    </Pressable>
  );
}

function getAvatarBgColor(name: string) {
  const colors = ['#e0f2fe', '#fef3c7', '#dcfce7', '#f3e8ff', '#fee2e2', '#e0e7ff'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

function getAvatarTextColor(name: string) {
  const colors = ['#0369a1', '#b45309', '#15803d', '#6b21a8', '#b91c1c', '#4338ca'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

export default function CommunityScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const feed = useCommunityFeed(filter);
  const { data: likedSet } = useMyLikes();
  const posts = useMemo<PostRow[]>(() => feed.data?.pages.flat() ?? [], [feed.data]);

  const insets = useSafeAreaInsets();

  return (
    <View style={s.container}>
      {/* Header — normal flex flow, status bar 까지 채움 */}
      <View style={[s.headerWrap, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>커뮤니티</Text>
          <Pressable
            onPress={() => router.push('/community/search')}
            style={({ pressed }) => [s.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={6}
          >
            <Feather name="search" size={20} color={c.text.primary} />
          </Pressable>
        </View>

        {/* Filter Pills — text-only segmented */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          {FILTER_TABS.map((t) => {
            const active = filter === t.key;
            return (
              <Pressable key={t.key} onPress={() => setFilter(t.key)} hitSlop={4}>
                {({ pressed }) => (
                  <View
                    style={[
                      s.chip,
                      active ? s.chipActive : s.chipInactive,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        s.chipText,
                        active ? s.chipTextActive : s.chipTextInactive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List States */}
      {feed.isLoading && (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={c.brand.primary} />
        </View>
      )}

      {feed.error && (
        <View style={s.errorContainer}>
          <Text style={s.errorText}>{feed.error.message}</Text>
        </View>
      )}

      {/* Feed List */}
      <FlatList
        className="flex-1"
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[s.listContent, { paddingTop: 16, paddingBottom: 100 }]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshing={feed.isRefetching}
          onRefresh={() => feed.refetch()}
          ListHeaderComponent={
            filter === 'all' ? <RecruitingCrewsStrip /> : null
          }
          ListEmptyComponent={
            !feed.isLoading && !feed.error && posts.length === 0 ? (
              <View style={filter !== 'all' ? { paddingTop: Math.max(insets.top, 20) + 60 } : undefined}>
                <EmptyState
                  icon={(FILTER_TABS.find((t) => t.key === filter)?.icon) ?? 'message-square'}
                  tone="muted"
                  title={
                    filter === 'all'
                      ? '게시글이 비어있어요'
                      : `'${POST_TYPE_LABEL[filter as PostType]}' 글이 없어요`
                  }
                  description={
                    filter === 'all'
                      ? '원하는 주제의 글을 남기고 다른 클라이머들과 대화를 시작해보세요!'
                      : '이 카테고리의 첫 글을 남겨보세요'
                  }
                  action={{
                    label: filter === 'all' ? '첫 글 등록하기' : `${POST_TYPE_LABEL[filter as PostType]} 글 쓰기`,
                    icon: 'edit-3',
                    onPress: () =>
                      router.push(
                        filter === 'all'
                          ? '/community/new'
                          : { pathname: '/community/new', params: { type: filter } },
                      ),
                  }}
                />
              </View>
            ) : null
          }
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <View style={s.footerLoader}>
                <ActivityIndicator color={c.brand.primary} />
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={s.cardSeparator} />}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              liked={likedSet?.has(item.id) ?? false}
              onPress={() =>
                router.push({ pathname: '/community/[id]', params: { id: item.id } })
              }
            />
          )}
        />

      {/* Floating write button */}
      <View pointerEvents="box-none" style={s.fabAnchor}>
        <Pressable
          onPress={() => router.push('/community/new')}
          hitSlop={6}
        >
          {({ pressed }) => (
            <View style={[s.fabContent, { opacity: pressed ? 0.85 : 1 }]}>
              <Feather name="edit-3" size={22} color={c.brand.onPrimary} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function PostCard({
  post,
  liked,
  onPress,
}: {
  post: PostRow;
  liked: boolean;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const toggle = useToggleLike();
  const authorName = post.author?.display_name ?? post.author?.username ?? '익명';
  const avatarUrl = post.author?.avatar_url;
  const badge = BADGE_COLORS[post.post_type] || BADGE_COLORS.general;
  const label = POST_TYPE_LABEL[post.post_type];
  const firstImage = post.image_urls[0];
  const meetup = post.post_type === 'meetup' ? describeMeetup(post, c) : null;
  const authorId = post.author_id;
  const goToProfile = () => {
    if (authorId) router.push({
      pathname: '/u/[id]',
      params: { id: authorId, returnTo: '/(tabs)/community' },
    } as never);
  };
  const time = formatRelativeTime(post.created_at);
  const gymName = post.gym
    ? `${post.gym.name}${post.gym.branch ? ` ${post.gym.branch}` : ''}`
    : null;
  const showMetrics = post.like_count > 0 || post.comment_count > 0;

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={[s.card, pressed && { backgroundColor: c.bg.subtle }]}>
          {/* Top: avatar + name + meta — type pill right.
              프로필 진입 가능한 영역은 아바타와 이름 텍스트만 (메타 라인은 카드 탭) */}
          <View style={s.cardHeader}>
            <View style={s.userInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={goToProfile} hitSlop={6} style={{ marginRight: 10 }}>
                  {({ pressed: p2 }) => (
                    <View style={{ opacity: p2 ? 0.7 : 1 }}>
                      <UserAvatar
                        userKey={authorId}
                        username={authorName}
                        avatarUrl={avatarUrl}
                        size={36}
                      />
                    </View>
                  )}
                </Pressable>
                <View style={s.userText}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable onPress={goToProfile} hitSlop={6} style={{ flexShrink: 1 }}>
                      {({ pressed: p2 }) => (
                        <Text
                          style={[s.userName, { opacity: p2 ? 0.7 : 1 }]}
                          numberOfLines={1}
                        >
                          {authorName}
                        </Text>
                      )}
                    </Pressable>
                    <View style={{ marginLeft: 5 }}>
                      <FeaturedBadgeChip badgeKey={post.author?.featured_badge_key} size={10} />
                    </View>
                  </View>
                  <Text style={s.timeText} numberOfLines={1}>
                    {gymName ? `${gymName} · ${time}` : time}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[s.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[s.badgeText, { color: badge.text }]} numberOfLines={1}>{label}</Text>
            </View>
          </View>

          {/* Title + body */}
          {!!post.title && (
            <Text style={s.cardTitle} numberOfLines={2}>{post.title}</Text>
          )}
          {!!post.body && (
            <Text style={s.cardBody} numberOfLines={meetup ? 2 : 3}>{post.body}</Text>
          )}

          {/* Thumbnail */}
          {!!firstImage && (
            <View style={s.cardImageWrapper}>
              <Image source={{ uri: firstImage }} style={s.cardImage} resizeMode="cover" />
            </View>
          )}

          {/* Meetup info card (brand-tinted) */}
          {meetup && (
            <View style={s.meetupInfoBox}>
              <View style={s.meetupInfoRow}>
                <Feather name="calendar" size={13} color={c.status.warning} />
                <Text style={s.meetupInfoText} numberOfLines={1}>{meetup.when}</Text>
                {meetup.statusLabel && (
                  <View style={[s.meetupStatusPill, meetup.statusColor]}>
                    <Text style={[s.meetupStatusText, meetup.statusTextColor]}>{meetup.statusLabel}</Text>
                  </View>
                )}
              </View>
              {meetup.where && (
                <View style={s.meetupInfoRow}>
                  <Feather name="map-pin" size={13} color={c.status.warning} />
                  <Text style={s.meetupInfoText} numberOfLines={1}>{meetup.where}</Text>
                </View>
              )}
              <View style={s.meetupInfoRow}>
                <Feather name="users" size={13} color={c.status.warning} />
                <Text style={s.meetupInfoText} numberOfLines={1}>{meetup.capacity}</Text>
              </View>
            </View>
          )}

          {/* Metrics — only if any > 0 */}
          {showMetrics && (
            <View style={s.cardFooter}>
              {post.like_count > 0 && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    if (toggle.isPending) return;
                    toggle.mutate({ postId: post.id, currentlyLiked: liked });
                  }}
                  hitSlop={8}
                >
                  {({ pressed: p3 }) => (
                    <View style={[s.metricBtn, { opacity: p3 ? 0.6 : 1 }]}>
                      <Ionicons name={liked ? 'heart' : 'heart-outline'} size={15} color={liked ? c.status.danger : c.text.muted} />
                      <Text style={[s.metricCountText, liked && s.metricCountTextLiked]}>
                        {post.like_count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              )}
              {post.comment_count > 0 && (
                <View style={s.metricBtn}>
                  <Feather name="message-circle" size={14} color={c.text.muted} />
                  <Text style={s.metricCountText}>{post.comment_count}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg.primary,
    },
    recruitStrip: {
      // 흰색 영역 안쪽 패딩 (그라데이션이 깔린 상태에서 콘텐츠가 숨 쉴 공간)
      paddingTop: 14,
      paddingBottom: 18,
      // FlatList listContent 의 paddingHorizontal(16) 을 음수 마진으로 상쇄해 page 끝까지 깔리도록
      marginHorizontal: -16,
      // FlatList listContent 의 paddingTop(16) 도 상쇄해서 헤더 바로 아래에 붙음
      marginTop: -16,
      // 본문 카드들과 시각적 분리 (가로 스크롤이라 다르단 걸 보여줌)
      marginBottom: 4,
      // 그라데이션이 깔리도록 배경은 LinearGradient 가 채움 → 별도 backgroundColor 없음
      overflow: 'hidden',
    },
    recruitStripHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    recruitStripTitleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    recruitStripIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.brand.primaryLight,
    },
    recruitStripTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: c.text.primary,
      letterSpacing: -0.3,
    },
    recruitStripSub: {
      fontSize: 11,
      fontWeight: '700',
      color: c.text.tertiary,
      marginTop: 1,
    },
    recruitStripMore: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.brand.primaryLight,
    },
    recruitStripMoreText: {
      fontSize: 11.5,
      fontWeight: '900',
      color: c.brand.primaryDeep,
      letterSpacing: -0.2,
    },
    recruitScroll: {
      paddingHorizontal: 20,
      gap: 10,
    },
    recruitCard: {
      width: 128,
      backgroundColor: c.bg.card,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 10,
      alignItems: 'center',
      gap: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    recruitCardAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.brand.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      borderWidth: 2,
      borderColor: c.bg.card,
    },
    newBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: c.brand.primary,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: c.bg.card,
      shadowColor: c.brand.primary,
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    newBadgeText: {
      color: '#ffffff',
      fontSize: 8.5,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
    recruitingChip: {
      backgroundColor: c.status.successBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginTop: 2,
    },
    recruitingChipText: {
      color: c.status.success,
      fontSize: 10,
      fontWeight: '900',
    },
    recruitCardAvatarImg: { width: '100%', height: '100%' },
    recruitCardAvatarText: {
      fontSize: 19,
      fontWeight: '900',
      color: c.brand.primaryDeep,
      letterSpacing: -0.5,
    },
    recruitCardName: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text.primary,
      textAlign: 'center',
      width: '100%',
      letterSpacing: -0.3,
      marginTop: 2,
    },
    recruitCardMeta: {
      fontSize: 11,
      fontWeight: '700',
      color: c.text.tertiary,
      textAlign: 'center',
    },
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
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: c.text.primary,
      letterSpacing: -0.6,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabAnchor: {
      position: 'absolute',
      bottom: 100,
      right: 16,
      zIndex: 10,
      elevation: 10,
    },
    fabContent: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.brand.primary,
      shadowOpacity: 0.4,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    filterScroll: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 6,
      flexDirection: 'row',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    chipActive: {
      backgroundColor: c.brand.primary,
    },
    chipInactive: {
      backgroundColor: c.bg.subtle,
    },
    chipText: {
      fontSize: 13,
      letterSpacing: -0.2,
    },
    chipTextActive: {
      color: c.brand.onPrimary,
      fontWeight: '900',
    },
    chipTextInactive: {
      color: c.text.secondary,
      fontWeight: '700',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorContainer: {
      margin: 20,
      padding: 16,
      borderRadius: 16,
      backgroundColor: c.status.dangerBg,
      borderWidth: 1,
      borderColor: c.status.danger,
    },
    errorText: {
      color: c.status.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyIconWrapper: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.bg.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border.subtle,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text.primary,
    },
    emptySubtitle: {
      fontSize: 14,
      color: c.text.tertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyBtn: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.brand.primary,
    },
    emptyBtnText: {
      color: c.brand.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 120,
    },
    footerLoader: {
      paddingVertical: 16,
    },

    card: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      borderRadius: 18,
      padding: 16,
      backgroundColor: c.bg.card,
      shadowColor: c.shadow.color,
      shadowOpacity: c.shadow.opacity,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1,
      overflow: 'hidden',
    },
    cardSeparator: { height: 10 },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 8,
    },
    userInfo: {
      flex: 1,
      minWidth: 0,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginRight: 10,
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarTextVal: {
      fontWeight: '900',
      fontSize: 14,
    },
    userText: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    userName: {
      fontSize: 14,
      fontWeight: '900',
      color: c.text.primary,
      letterSpacing: -0.2,
    },
    timeText: {
      fontSize: 11.5,
      color: c.text.tertiary,
      fontWeight: '700',
      marginTop: 1,
    },
    badge: {
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 9,
      paddingVertical: 3.5,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 10.5,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    cardTitle: {
      fontSize: 16.5,
      fontWeight: '900',
      color: c.text.primary,
      lineHeight: 23,
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    cardBody: {
      fontSize: 14,
      color: c.text.secondary,
      lineHeight: 20,
      fontWeight: '500',
      marginBottom: 10,
    },
    cardImageWrapper: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      marginBottom: 10,
    },
    cardImage: {
      width: '100%',
      height: 180,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border.subtle,
    },
    metricBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flexShrink: 0,
    },
    metricCountText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: c.text.tertiary,
    },
    metricCountTextLiked: {
      color: c.status.danger,
    },

    meetupInfoBox: {
      backgroundColor: c.status.warningBg,
      borderWidth: 1,
      borderColor: c.status.warning + '33',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      gap: 6,
    },
    meetupInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    meetupInfoText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
      color: c.status.warning,
    },
    meetupStatusPill: {
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 999,
    },
    meetupStatusText: {
      fontSize: 10.5,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
  });
}
