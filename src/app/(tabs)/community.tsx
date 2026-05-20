import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
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

const FILTER_TABS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: '전체', icon: 'layers' },
  { key: 'general', label: POST_TYPE_LABEL.general, icon: 'message-circle' },
  { key: 'question', label: POST_TYPE_LABEL.question, icon: 'help-circle' },
  { key: 'review', label: POST_TYPE_LABEL.review, icon: 'star' },
];

const BADGE_CONFIG = {
  general: { accent: '#6366f1', label: '일반' },
  question: { accent: '#8b5cf6', label: '질문' },
  review: { accent: '#10b981', label: '후기' },
  meetup: { accent: '#f59e0b', label: '모임' },
} as const;

// Deterministic color from string
function hashColor(name: string, palette: string[]) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return palette[sum % palette.length];
}

const AVATAR_BG = ['#e0e7ff', '#fce7f3', '#d1fae5', '#fef9c3', '#fee2e2', '#e0f2fe'];
const AVATAR_FG = ['#4338ca', '#be185d', '#065f46', '#854d0e', '#b91c1c', '#0369a1'];

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

// ─────────────────────────────────────────────
export default function CommunityScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');
  const feed = useCommunityFeed(filter);
  const { data: likedSet } = useMyLikes();
  const posts = useMemo<PostRow[]>(() => feed.data?.pages.flat() ?? [], [feed.data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }} edges={['top']}>
      {/* ── Header ─────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 10,
          backgroundColor: '#fafafa',
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -1 }}>
          커뮤니티
        </Text>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={() =>
              Alert.alert('준비 중', '검색 기능은 다음 업데이트에 추가됩니다.')
            }
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: pressed ? '#f1f5f9' : '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Feather name="search" size={17} color="#64748b" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/community/new')}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: pressed ? '#0f766e' : '#0d9488',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.9 : 1,
              shadowColor: '#0d9488',
              shadowOpacity: 0.25,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            })}
          >
            <Feather name="edit-3" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* ── Tab Filter (underline style) ────────── */}
      <View
        style={{
          backgroundColor: '#fafafa',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 0 }}
        >
          {FILTER_TABS.map((t) => {
            const active = filter === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setFilter(t.key)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 4,
                  paddingVertical: 14,
                  marginRight: 20,
                  borderBottomWidth: 2,
                  borderBottomColor: active ? '#0d9488' : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Feather
                  name={t.icon as any}
                  size={13}
                  color={active ? '#0d9488' : '#94a3b8'}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: active ? '800' : '500',
                    color: active ? '#0d9488' : '#94a3b8',
                    letterSpacing: active ? -0.2 : 0,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── States ─────────────────────────────── */}
      {feed.isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      )}

      {feed.error && (
        <View
          style={{
            margin: 20,
            padding: 16,
            borderRadius: 16,
            backgroundColor: '#fef2f2',
            borderWidth: 1,
            borderColor: '#fecaca',
          }}
        >
          <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>
            {feed.error.message}
          </Text>
        </View>
      )}

      {!feed.isLoading && !feed.error && posts.length === 0 && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="message-square" size={28} color="#94a3b8" />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>
            아직 글이 없어요
          </Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 }}>
            클라이머들의 첫 이야기를{'\n'}여기서 시작해보세요!
          </Text>
          <Pressable
            onPress={() => router.push('/community/new')}
            style={({ pressed }) => ({
              marginTop: 4,
              paddingHorizontal: 20,
              paddingVertical: 11,
              borderRadius: 24,
              backgroundColor: '#0d9488',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
              첫 글 쓰기
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Feed ───────────────────────────────── */}
      {posts.length > 0 && (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshing={feed.isRefetching}
          onRefresh={() => feed.refetch()}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />
          )}
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <View style={{ paddingVertical: 24 }}>
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

// ─────────────────────────────────────────────
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
  const firstChar = authorName.charAt(0).toUpperCase() || '?';
  const avatarBg = hashColor(authorName, AVATAR_BG);
  const avatarFg = hashColor(authorName, AVATAR_FG);
  const badge = BADGE_CONFIG[post.post_type] ?? BADGE_CONFIG.general;
  const firstImage = post.image_urls[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: pressed ? '#f8fafc' : '#fafafa',
      })}
    >
      {/* Left column: avatar + vertical thread line */}
      <View style={{ alignItems: 'center', gap: 0 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: avatarBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: avatarFg, fontWeight: '800', fontSize: 16 }}>
            {firstChar}
          </Text>
        </View>
      </View>

      {/* Right column: content */}
      <View style={{ flex: 1 }}>
        {/* Name row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: '#0f172a' }}>
              {authorName}
            </Text>
            {/* Accent dot */}
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: badge.accent,
              }}
            />
            <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '500' }}>
              {badge.label}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: '#cbd5e1', fontWeight: '500' }}>
            {formatRelativeTime(post.created_at)}
          </Text>
        </View>

        {/* Title */}
        {post.title ? (
          <Text
            style={{
              fontSize: 15,
              fontWeight: '800',
              color: '#0f172a',
              lineHeight: 22,
              marginBottom: 4,
              letterSpacing: -0.3,
            }}
            numberOfLines={2}
          >
            {post.title}
          </Text>
        ) : null}

        {/* Body */}
        <Text
          style={{
            fontSize: 14,
            color: '#475569',
            lineHeight: 22,
            marginBottom: 10,
          }}
          numberOfLines={4}
        >
          {post.body}
        </Text>

        {/* Image */}
        {firstImage && (
          <View
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 10,
              borderWidth: 1,
              borderColor: '#f1f5f9',
            }}
          >
            <Image
              source={{ uri: firstImage }}
              style={{ width: '100%', height: 200 }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Gym tag */}
        {post.gym && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              alignSelf: 'flex-start',
              backgroundColor: '#f8fafc',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <Feather name="map-pin" size={10} color="#94a3b8" />
            <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>
              {post.gym.name}
              {post.gym.branch ? ` ${post.gym.branch}` : ''}
            </Text>
          </View>
        )}

        {/* Action bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          {/* Like */}
          <Pressable
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              if (!toggle.isPending) {
                toggle.mutate({ postId: post.id, currentlyLiked: liked });
              }
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Feather
              name="heart"
              size={16}
              color={liked ? '#ef4444' : '#94a3b8'}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: liked ? '#ef4444' : '#94a3b8',
              }}
            >
              {post.like_count}
            </Text>
          </Pressable>

          {/* Comment */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="message-circle" size={16} color="#94a3b8" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8' }}>
              {post.comment_count}
            </Text>
          </View>

          {/* Share placeholder */}
          <Pressable
            hitSlop={8}
            onPress={(e) => e.stopPropagation()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="share" size={16} color="#94a3b8" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
