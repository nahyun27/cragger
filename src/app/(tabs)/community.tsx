import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${dd}`;
}

function getAvatarBgColor(name: string) {
  const colors = [
    '#e0f2fe', // sky
    '#fef3c7', // amber
    '#dcfce7', // green
    '#f3e8ff', // purple
    '#fee2e2', // rose
    '#e0e7ff', // indigo
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
}

function getAvatarTextColor(name: string) {
  const colors = [
    '#0369a1',
    '#b45309',
    '#15803d',
    '#6b21a8',
    '#b91c1c',
    '#4338ca',
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
}

export default function CommunityScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');
  const feed = useCommunityFeed(filter);
  const { data: likedSet } = useMyLikes();

  const posts = useMemo<PostRow[]>(
    () => feed.data?.pages.flat() ?? [],
    [feed.data],
  );

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      {/* Header bar */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border-subtle bg-background-primary">
        <View>
          <Text className="text-text-primary text-2xl font-extrabold tracking-tight">커뮤니티</Text>
          <Text className="text-text-tertiary text-xs mt-0.5">클라이머들의 소통과 정보 공유</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => Alert.alert('준비 중', '검색 기능은 다음 업데이트에 추가됩니다.')}
            style={({ pressed }) => [
              {
                padding: 9,
                borderRadius: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                opacity: pressed ? 0.6 : 1,
              }
            ]}
          >
            <Feather name="search" size={18} color="#71717a" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/community/new')}
            style={({ pressed }) => [
              {
                padding: 9,
                borderRadius: 12,
                backgroundColor: 'rgba(13, 148, 136, 0.08)',
                opacity: pressed ? 0.6 : 1,
              }
            ]}
          >
            <Feather name="plus" size={18} color="#0d9488" />
          </Pressable>
        </View>
      </View>

      {/* Apple-style Sliding Segmented Control */}
      <View className="px-6 py-3.5 bg-background-primary border-b border-border-subtle/50">
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#f1f5f9',
            borderRadius: 14,
            padding: 3,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}
        >
          {FILTER_TABS.map((t) => {
            const active = filter === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setFilter(t.key)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 9,
                    borderRadius: 11,
                    backgroundColor: active ? '#ffffff' : 'transparent',
                    opacity: pressed ? 0.85 : 1,
                    // Elegant drop shadow for active pill
                    shadowColor: active ? '#000' : 'transparent',
                    shadowOpacity: active ? 0.05 : 0,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1.5 },
                    elevation: active ? 1 : 0,
                  }
                ]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: active ? '800' : '600',
                    color: active ? '#0d9488' : '#64748b',
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Main Content Area */}
      {feed.isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      )}

      {feed.error && (
        <View className="m-6 border border-status-danger/20 rounded-2xl p-4 bg-status-danger/5">
          <Text className="text-status-danger text-sm font-semibold">{feed.error.message}</Text>
        </View>
      )}

      {!feed.isLoading && !feed.error && posts.length === 0 && (
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <View className="w-16 h-16 rounded-full bg-slate-50 items-center justify-center border border-slate-100 shadow-sm">
            <Feather name="message-square" size={24} color="#94a3b8" />
          </View>
          <View className="items-center">
            <Text className="text-text-primary text-base font-extrabold">게시글이 비어있어요</Text>
            <Text className="text-text-tertiary text-xs mt-1 text-center leading-5">
              원하는 주제의 글을 남기고 다른 클라이머들과 대화를 시작해보세요!
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/community/new')}
            style={({ pressed }) => [
              {
                marginTop: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: '#0d9488',
                opacity: pressed ? 0.9 : 1,
              }
            ]}
          >
            <Text className="text-white text-xs font-bold">첫 글 등록하기</Text>
          </Pressable>
        </View>
      )}

      {posts.length > 0 && (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 }}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshing={feed.isRefetching}
          onRefresh={() => feed.refetch()}
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <View className="py-6">
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

      {/* Floating Action Button */}
      <Pressable
        onPress={() => router.push('/community/new')}
        style={({ pressed }) => [
          {
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#0d9488',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
            shadowColor: '#0d9488',
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }
        ]}
      >
        <Feather name="edit-3" size={22} color="white" />
      </Pressable>
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

  const badgeConfig = {
    general: {
      bg: 'rgba(59, 130, 246, 0.06)',
      border: 'rgba(59, 130, 246, 0.12)',
      text: '#2563eb',
      label: '일반',
    },
    question: {
      bg: 'rgba(99, 102, 241, 0.06)',
      border: 'rgba(99, 102, 241, 0.12)',
      text: '#4f46e5',
      label: '질문',
    },
    review: {
      bg: 'rgba(16, 185, 129, 0.06)',
      border: 'rgba(16, 185, 129, 0.12)',
      text: '#059669',
      label: '후기',
    },
    meetup: {
      bg: 'rgba(245, 158, 11, 0.06)',
      border: 'rgba(245, 158, 11, 0.12)',
      text: '#d97706',
      label: '모임',
    },
  };

  const typeMeta = badgeConfig[post.post_type] || badgeConfig.general;
  const firstImage = post.image_urls[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#f1f5f9',
          borderRadius: 24,
          padding: 18,
          marginBottom: 14,
          opacity: pressed ? 0.97 : 1,
          shadowColor: '#0f172a',
          shadowOpacity: 0.03,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 1,
        }
      ]}
    >
      {/* Header: User Info & Post Type */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center gap-3">
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: getAvatarBgColor(authorName),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: getAvatarTextColor(authorName),
                fontWeight: '800',
                fontSize: 14,
              }}
            >
              {firstChar}
            </Text>
          </View>
          <View>
            <Text className="text-text-primary text-sm font-bold">{authorName}</Text>
            <Text className="text-text-tertiary text-[10px] mt-0.5">
              {formatRelativeTime(post.created_at)}
            </Text>
          </View>
        </View>

        {/* Post Type Badge */}
        <View
          style={{
            backgroundColor: typeMeta.bg,
            borderWidth: 1,
            borderColor: typeMeta.border,
            paddingHorizontal: 10,
            paddingVertical: 3.5,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: typeMeta.text,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.3,
            }}
          >
            {typeMeta.label}
          </Text>
        </View>
      </View>

      {/* Title */}
      {post.title && (
        <Text className="text-text-primary text-base font-extrabold mb-1.5 leading-6 tracking-tight">
          {post.title}
        </Text>
      )}

      {/* Body preview */}
      <Text className="text-text-secondary text-sm leading-6 mb-3.5" numberOfLines={3}>
        {post.body}
      </Text>

      {/* Image Preview */}
      {firstImage && (
        <View className="rounded-2xl overflow-hidden mb-3.5 border border-slate-100">
          <Image
            source={{ uri: firstImage }}
            style={{ width: '100%', height: 190 }}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Gym location badge */}
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
            paddingHorizontal: 10,
            paddingVertical: 4.5,
            borderRadius: 10,
            marginBottom: 2,
          }}
        >
          <Feather name="map-pin" size={11} color="#64748b" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
            {post.gym.name}
            {post.gym.branch ? ` ${post.gym.branch}` : ''}
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: '#f1f5f9', marginTop: 14, marginBottom: 14 }} />

      {/* Bottom Metrics Bar */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (toggle.isPending) return;
              toggle.mutate({ postId: post.id, currentlyLiked: liked });
            }}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                opacity: pressed ? 0.6 : 1,
              }
            ]}
            hitSlop={8}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: liked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 0, 0, 0.02)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather
                name="heart"
                size={14}
                color={liked ? '#ef4444' : '#64748b'}
              />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: liked ? '#ef4444' : '#64748b',
              }}
            >
              {post.like_count}
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="message-circle" size={14} color="#64748b" />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
              {post.comment_count}
            </Text>
          </View>
        </View>

        <Feather name="chevron-right" size={16} color="#cbd5e1" />
      </View>
    </Pressable>
  );
}
