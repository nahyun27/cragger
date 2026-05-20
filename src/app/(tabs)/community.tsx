import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
      <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
        <Text className="text-text-primary text-3xl font-bold tracking-tight">
          커뮤니티
        </Text>
      </View>

      <View className="flex-row gap-2 px-6 pb-3">
        {FILTER_TABS.map((t) => {
          const active = filter === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setFilter(t.key)}
              className={`px-3.5 py-1.5 rounded-full border ${
                active
                  ? 'border-brand-primary bg-brand-primary/10'
                  : 'border-border-subtle bg-background-primary'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  active ? 'text-brand-primary' : 'text-text-tertiary'
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {feed.isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0d9488" />
        </View>
      )}

      {feed.error && (
        <View className="mx-6 border border-status-danger/30 rounded-xl p-4 bg-status-danger/10">
          <Text className="text-status-danger">{feed.error.message}</Text>
        </View>
      )}

      {!feed.isLoading && !feed.error && posts.length === 0 && (
        <View className="flex-1 items-center justify-center px-6">
          <Feather name="message-square" size={32} color="#a1a1aa" />
          <Text className="text-text-secondary text-base mt-3 font-semibold">
            아직 글이 없어요
          </Text>
          <Text className="text-text-tertiary text-sm mt-1">
            첫 글을 남겨보세요
          </Text>
        </View>
      )}

      {posts.length > 0 && (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerClassName="px-4 pb-24 gap-3"
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshing={feed.isRefetching}
          onRefresh={() => feed.refetch()}
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <View className="py-4">
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

      <Pressable
        onPress={() => router.push('/community/new')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-brand-primary items-center justify-center active:opacity-80"
        style={{
          shadowColor: '#0d9488',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
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
  const typeLabel =
    post.post_type === 'meetup'
      ? '모임'
      : POST_TYPE_LABEL[post.post_type as Exclude<PostType, 'meetup'>];
  const firstImage = post.image_urls[0];

  return (
    <Pressable
      onPress={onPress}
      className="bg-background-secondary border border-border-subtle rounded-2xl p-4 active:opacity-90"
    >
      <View className="flex-row items-center gap-2 mb-2">
        <View className="px-2 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">
          <Text className="text-brand-primary text-[10px] font-bold">{typeLabel}</Text>
        </View>
        <Text className="text-text-tertiary text-xs">
          {authorName} · {formatRelativeTime(post.created_at)}
        </Text>
      </View>

      {post.title && (
        <Text
          className="text-text-primary text-base font-bold mb-1"
          numberOfLines={1}
        >
          {post.title}
        </Text>
      )}

      <Text className="text-text-secondary text-sm leading-5" numberOfLines={3}>
        {post.body}
      </Text>

      {firstImage && (
        <Image
          source={{ uri: firstImage }}
          className="mt-3 w-full h-48 rounded-xl"
          resizeMode="cover"
        />
      )}

      <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-border-subtle/60">
        <View className="flex-row items-center gap-2">
          {post.gym && (
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-background-tertiary border border-border-subtle">
              <Feather name="map-pin" size={10} color="#71717a" />
              <Text className="text-text-tertiary text-[10px] font-semibold">
                {post.gym.name}
                {post.gym.branch ? ` ${post.gym.branch}` : ''}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (toggle.isPending) return;
              toggle.mutate({ postId: post.id, currentlyLiked: liked });
            }}
            hitSlop={8}
            className="flex-row items-center gap-1 active:opacity-60"
          >
            <Feather
              name="heart"
              size={14}
              color={liked ? '#ef4444' : '#71717a'}
            />
            <Text
              className={`text-xs font-semibold ${
                liked ? 'text-status-danger' : 'text-text-tertiary'
              }`}
            >
              {post.like_count}
            </Text>
          </Pressable>
          <View className="flex-row items-center gap-1">
            <Feather name="message-circle" size={14} color="#71717a" />
            <Text className="text-text-tertiary text-xs font-semibold">
              {post.comment_count}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
