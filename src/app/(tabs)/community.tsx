import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import {
  POST_TYPE_LABEL,
  useCommunityFeed,
  useMyLikes,
  useToggleLike,
  type PostRow,
  type PostType,
} from '@/hooks/use-community';
import { useRecruitingCrews, type CrewSummary } from '@/hooks/use-crews';
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
function describeMeetup(post: PostRow): {
  when: string;
  where: string | null;
  capacity: string;
  statusLabel: string | null;
  statusColor: { backgroundColor: string };
  statusTextColor: { color: string };
} {
  let when = '날짜 미정';
  let statusLabel: string | null = null;
  let statusBg = '#fef3c7';
  let statusFg = '#b45309';
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
      statusBg = '#f1f5f9';
      statusFg = '#64748b';
    } else if (hoursLeft < 48) {
      statusLabel = '곧 시작';
      statusBg = '#fee2e2';
      statusFg = '#dc2626';
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
    statusBg = '#f1f5f9';
    statusFg = '#64748b';
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

// ── 공개 모집 크루 가로 스크롤 ──────────────────────────────────
function RecruitingCrewsStrip() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data } = useRecruitingCrews(10);
  if (!data || data.length === 0) return null;
  return (
    <View style={s.recruitStrip}>
      <View style={s.recruitStripHeader}>
        <Text style={s.recruitStripTitle}>공개 모집 중인 크루</Text>
        <Pressable onPress={() => router.push('/crews/explore' as never)} hitSlop={6}>
          {({ pressed }) => (
            <Text style={[s.recruitStripMore, pressed && { opacity: 0.6 }]}>전체 보기</Text>
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

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>커뮤니티</Text>
          <Text style={s.headerSubtitle}>클라이머들의 소통과 정보 공유</Text>
        </View>
        <Pressable
          onPress={() => router.push('/community/search')}
          style={({ pressed }) => [s.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={6}
        >
          <Feather name="search" size={18} color={c.text.tertiary} />
        </Pressable>
      </View>

      {/* Filter Pills */}
      <View style={s.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          {FILTER_TABS.map((t) => {
            const active = filter === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setFilter(t.key)}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      s.chip,
                      active ? s.chipActive : s.chipInactive,
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <Feather
                      name={t.icon}
                      size={13}
                      color={active ? c.brand.primary : c.text.tertiary}
                    />
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

      {!feed.isLoading && !feed.error && posts.length === 0 && (
        <View style={s.emptyContainer}>
          <View style={s.emptyIconWrapper}>
            <Feather name="message-square" size={28} color={c.text.muted} />
          </View>
          <Text style={s.emptyTitle}>게시글이 비어있어요</Text>
          <Text style={s.emptySubtitle}>
            원하는 주제의 글을 남기고 다른 클라이머들과 대화를 시작해보세요!
          </Text>
          <Pressable
            onPress={() => router.push('/community/new')}
            style={({ pressed }) => [s.emptyBtn, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={s.emptyBtnText}>첫 글 등록하기</Text>
          </Pressable>
        </View>
      )}

      {/* Recruiting crews — 전체 필터일 때만 노출 */}
      {filter === 'all' && <RecruitingCrewsStrip />}

      {/* Feed List */}
      {posts.length > 0 && (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={s.listContent}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshing={feed.isRefetching}
          onRefresh={() => feed.refetch()}
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
      )}

      {/* Floating write button — absolute anchor on a static View;
          Pressable uses children-as-function so the fab visual styles
          stay on a real View (Pressable's style-array form has been
          eating width/bg/etc. elsewhere). */}
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
    </SafeAreaView>
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
  const toggle = useToggleLike();
  const authorName = post.author?.display_name ?? post.author?.username ?? '익명';
  const firstChar = authorName.length > 0 ? authorName.charAt(0).toUpperCase() : '?';
  const avatarBg = getAvatarBgColor(authorName);
  const avatarText = getAvatarTextColor(authorName);
  const avatarUrl = post.author?.avatar_url;
  const badge = BADGE_COLORS[post.post_type] || BADGE_COLORS.general;
  const label = POST_TYPE_LABEL[post.post_type];
  const firstImage = post.image_urls[0];
  const meetup = post.post_type === 'meetup' ? describeMeetup(post) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        {
          backgroundColor: c.bg.card,
          opacity: pressed ? 0.97 : 1,
          shadowColor: c.shadow.color,
          shadowOpacity: c.shadow.opacity,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        },
      ]}
    >
      {/* Header Info */}
      <View style={s.cardHeader}>
        <View style={s.userInfo}>
          <View style={[s.avatar, { backgroundColor: avatarBg }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={s.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={[s.avatarTextVal, { color: avatarText }]}>{firstChar}</Text>
            )}
          </View>
          <View style={s.userText}>
            <Text style={s.userName} numberOfLines={1}>{authorName}</Text>
            <Text style={s.timeText}>{formatRelativeTime(post.created_at)}</Text>
          </View>
        </View>

        {/* Type Badge */}
        <View style={[s.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={[s.badgeText, { color: badge.text }]}>{label}</Text>
        </View>
      </View>

      {/* Location Badge (above title) */}
      {post.gym && (
        <View style={s.locationBadge}>
          <Feather name="map-pin" size={11} color={c.text.tertiary} />
          <Text style={s.locationText} numberOfLines={1}>
            {post.gym.name}
            {post.gym.branch ? ` ${post.gym.branch}` : ''}
          </Text>
        </View>
      )}

      {/* Meetup info block */}
      {meetup && (
        <View style={s.meetupInfoBox}>
          <View style={s.meetupInfoRow}>
            <Feather name="calendar" size={12} color={c.status.warning} />
            <Text style={s.meetupInfoText} numberOfLines={1}>{meetup.when}</Text>
          </View>
          {meetup.where && (
            <View style={s.meetupInfoRow}>
              <Feather name="map-pin" size={12} color={c.status.warning} />
              <Text style={s.meetupInfoText} numberOfLines={1}>{meetup.where}</Text>
            </View>
          )}
          <View style={s.meetupInfoRow}>
            <Feather name="users" size={12} color={c.status.warning} />
            <Text style={s.meetupInfoText} numberOfLines={1}>{meetup.capacity}</Text>
            {meetup.statusLabel && (
              <View style={[s.meetupStatusPill, meetup.statusColor]}>
                <Text style={[s.meetupStatusText, meetup.statusTextColor]}>{meetup.statusLabel}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      {post.title && (
        <Text style={s.cardTitle} numberOfLines={1}>
          {post.title}
        </Text>
      )}
      <Text style={s.cardBody} numberOfLines={3}>
        {post.body}
      </Text>

      {/* Post Image */}
      {firstImage && (
        <View style={s.cardImageWrapper}>
          <Image source={{ uri: firstImage }} style={s.cardImage} resizeMode="cover" />
        </View>
      )}

      {/* Footer Metrics */}
      <View style={s.cardFooter}>
        <View style={s.metricsRow}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (toggle.isPending) return;
              toggle.mutate({ postId: post.id, currentlyLiked: liked });
            }}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View style={s.metricBtn}>
              <Feather name="heart" size={16} color={liked ? c.status.danger : c.text.muted} />
              <Text
                style={[s.metricCountText, liked && s.metricCountTextLiked]}
                numberOfLines={1}
              >{post.like_count}</Text>
            </View>
          </Pressable>

          <View style={s.metricBtn}>
            <Feather name="message-circle" size={16} color={c.text.muted} />
            <Text style={s.metricCountText} numberOfLines={1}>{post.comment_count}</Text>
          </View>
        </View>

        <Feather name="chevron-right" size={16} color={c.border.strong} />
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg.card,
    },
    recruitStrip: {
      paddingTop: 14,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
      backgroundColor: c.bg.card,
    },
    recruitStripHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    recruitStripTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text.primary,
      letterSpacing: -0.2,
    },
    recruitStripMore: {
      fontSize: 12,
      fontWeight: '700',
      color: c.brand.primary,
    },
    recruitScroll: {
      paddingHorizontal: 20,
      gap: 10,
    },
    recruitCard: {
      width: 120,
      backgroundColor: c.bg.subtle,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      gap: 6,
    },
    recruitCardAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.bg.card,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    newBadge: {
      position: 'absolute',
      top: -4,
      right: -6,
      backgroundColor: c.status.danger,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: c.bg.card,
    },
    newBadgeText: {
      color: '#ffffff',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    recruitCardAvatarImg: { width: '100%', height: '100%' },
    recruitCardAvatarText: {
      fontSize: 16,
      fontWeight: '900',
      color: c.text.secondary,
    },
    recruitCardName: {
      fontSize: 12,
      fontWeight: '800',
      color: c.text.primary,
      textAlign: 'center',
      width: '100%',
    },
    recruitCardMeta: {
      fontSize: 10,
      fontWeight: '700',
      color: c.text.tertiary,
      textAlign: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 14,
      backgroundColor: c.bg.card,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: c.text.primary,
      letterSpacing: -0.6,
    },
    headerSubtitle: {
      fontSize: 13,
      color: c.text.tertiary,
      marginTop: 2,
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
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
    filterWrapper: {
      backgroundColor: c.bg.card,
      borderBottomWidth: 1,
      borderColor: c.border.subtle,
    },
    filterScroll: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      flexDirection: 'row',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    chipActive: {
      backgroundColor: c.bg.accent,
      borderColor: c.brand.primary,
    },
    chipInactive: {
      backgroundColor: c.bg.subtle,
      borderColor: c.border.subtle,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    chipTextActive: {
      color: c.brand.primaryDeep,
      fontWeight: '800',
    },
    chipTextInactive: {
      color: c.text.secondary,
      fontWeight: '600',
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
      borderWidth: 1,
      borderColor: c.border.subtle,
      borderRadius: 20,
      padding: 18,
    },
    cardSeparator: {
      height: 1,
      backgroundColor: c.border.subtle,
      marginVertical: 12,
      marginHorizontal: 4,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarTextVal: {
      fontWeight: '800',
      fontSize: 15,
    },
    userText: {
      justifyContent: 'center',
    },
    userName: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text.primary,
    },
    timeText: {
      fontSize: 11,
      color: c.text.muted,
      marginTop: 2,
    },
    badge: {
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.text.primary,
      lineHeight: 24,
      marginBottom: 6,
    },
    cardBody: {
      fontSize: 15,
      color: c.text.secondary,
      lineHeight: 22,
      marginBottom: 12,
    },
    cardImageWrapper: {
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border.subtle,
      marginBottom: 12,
    },
    cardImage: {
      width: '100%',
      height: 180,
    },
    locationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: c.bg.subtle,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginBottom: 8,
    },
    locationText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text.secondary,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    metricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    metricBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    metricCountText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text.tertiary,
    },
    metricCountTextLiked: {
      color: c.status.danger,
    },

    meetupInfoBox: {
      backgroundColor: c.status.warningBg,
      borderWidth: 1,
      borderColor: c.status.warning,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      gap: 6,
    },
    meetupInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    meetupInfoText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: c.status.warning,
    },
    meetupStatusPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    meetupStatusText: {
      fontSize: 11,
      fontWeight: '800',
    },
  });
}
