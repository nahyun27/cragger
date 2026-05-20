import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
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

type FilterKey = 'all' | Exclude<PostType, 'meetup'>;

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'general', label: POST_TYPE_LABEL.general },
  { key: 'question', label: POST_TYPE_LABEL.question },
  { key: 'review', label: POST_TYPE_LABEL.review },
];

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  general: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  question: { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' },
  review: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  meetup: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
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
        <View style={s.headerActions}>
          <Pressable
            onPress={() => Alert.alert('준비 중', '검색 기능은 준비 중입니다.')}
            style={({ pressed }) => [s.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={6}
          >
            <Feather name="search" size={18} color="#0f172a" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/community/new')}
            style={({ pressed }) => [s.writeBtn, { opacity: pressed ? 0.85 : 1 }]}
            hitSlop={6}
          >
            <Feather name="edit-3" size={14} color="#ffffff" />
            <Text style={s.writeBtnText}>글쓰기</Text>
          </Pressable>
        </View>
      </View>

      {/* Segmented Filter Control */}
      <View style={s.filterWrapper}>
        <View style={s.segmentedControl}>
          {FILTER_TABS.map((t) => {
            const active = filter === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setFilter(t.key)}
                style={({ pressed }) => [
                  s.segmentBtn,
                  active && s.segmentBtnActive,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[s.segmentText, active && s.segmentTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* List States */}
      {feed.isLoading && (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
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
            <Feather name="message-square" size={28} color="#94a3b8" />
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
                <ActivityIndicator color="#0d9488" />
              </View>
            ) : null
          }
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
  const toggle = useToggleLike();
  const authorName = post.author?.display_name ?? post.author?.username ?? '익명';
  const firstChar = authorName.length > 0 ? authorName.charAt(0).toUpperCase() : '?';
  const avatarBg = getAvatarBgColor(authorName);
  const avatarText = getAvatarTextColor(authorName);
  const badge = BADGE_COLORS[post.post_type] || BADGE_COLORS.general;
  const label = post.post_type === 'meetup' ? '모임' : POST_TYPE_LABEL[post.post_type as Exclude<PostType, 'meetup'>];
  const firstImage = post.image_urls[0];

  return (
    <Pressable
      onPress={onPress}
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
      {/* Header Info */}
      <View style={s.cardHeader}>
        <View style={s.userInfo}>
          <View style={[s.avatar, { backgroundColor: avatarBg }]}>
            <Text style={[s.avatarTextVal, { color: avatarText }]}>{firstChar}</Text>
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

      {/* Location Badge */}
      {post.gym && (
        <View style={s.locationBadge}>
          <Feather name="map-pin" size={11} color="#64748b" />
          <Text style={s.locationText} numberOfLines={1}>
            {post.gym.name}
            {post.gym.branch ? ` ${post.gym.branch}` : ''}
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={s.cardDivider} />

      {/* Footer Metrics */}
      <View style={s.cardFooter}>
        <View style={s.metricsRow}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (toggle.isPending) return;
              toggle.mutate({ postId: post.id, currentlyLiked: liked });
            }}
            style={({ pressed }) => [s.metricBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Feather name="heart" size={16} color={liked ? '#ef4444' : '#94a3b8'} />
            <Text style={[s.metricCountText, liked && s.metricCountTextLiked]}>
              {post.like_count}
            </Text>
          </Pressable>

          <View style={s.metricBtn}>
            <Feather name="message-circle" size={16} color="#94a3b8" />
            <Text style={s.metricCountText}>{post.comment_count}</Text>
          </View>
        </View>

        <Feather name="chevron-right" size={16} color="#cbd5e1" />
      </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    shadowColor: '#0d9488',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  writeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  filterWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    fontWeight: '800',
    color: '#0d9488',
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
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#ef4444',
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
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0d9488',
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 13,
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

  // Card styles
  card: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
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
  },
  avatarTextVal: {
    fontWeight: '800',
    fontSize: 14,
  },
  userText: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardImageWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
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
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  metricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  metricCountTextLiked: {
    color: '#ef4444',
  },
});
