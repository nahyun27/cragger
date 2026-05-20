import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  general: { bg: '#eff6ff', text: '#2563eb' },
  question: { bg: '#faf5ff', text: '#7c3aed' },
  review: { bg: '#ecfdf5', text: '#059669' },
  meetup: { bg: '#fffbeb', text: '#d97706' },
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

function getAvatarBg(name: string) {
  const colors = ['#e0f2fe', '#fef3c7', '#dcfce7', '#f3e8ff', '#fee2e2', '#e0e7ff'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}
function getAvatarFg(name: string) {
  const colors = ['#0369a1', '#b45309', '#15803d', '#6b21a8', '#b91c1c', '#4338ca'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function CommunitySearchScreen() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const term = useDebounced(input.trim(), 300);
  const feed = useCommunityFeed('all', term);
  const { data: likedSet } = useMyLikes();
  const posts = useMemo<PostRow[]>(() => feed.data?.pages.flat() ?? [], [feed.data]);

  const hasTerm = term.length > 0;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </Pressable>
        <View style={s.searchBox}>
          <Feather name="search" size={16} color="#94a3b8" />
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="제목·본문 검색"
            placeholderTextColor="#94a3b8"
            style={s.searchInput}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
          />
          {input.length > 0 && (
            <Pressable onPress={() => setInput('')} hitSlop={8}>
              <Feather name="x-circle" size={16} color="#94a3b8" />
            </Pressable>
          )}
        </View>
      </View>

      {!hasTerm ? (
        <View style={s.placeholderWrap}>
          <View style={s.placeholderIcon}>
            <Feather name="search" size={28} color="#94a3b8" />
          </View>
          <Text style={s.placeholderTitle}>커뮤니티 검색</Text>
          <Text style={s.placeholderBody}>
            제목이나 본문에 들어간 단어로{'\n'}글을 찾을 수 있어요
          </Text>
        </View>
      ) : feed.isLoading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator color="#0d9488" />
        </View>
      ) : feed.error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{feed.error.message}</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={s.placeholderWrap}>
          <View style={s.placeholderIcon}>
            <Feather name="frown" size={28} color="#94a3b8" />
          </View>
          <Text style={s.placeholderTitle}>검색 결과가 없어요</Text>
          <Text style={s.placeholderBody}>다른 단어로 검색해보세요</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <Text style={s.resultsHeader}>
              "{term}" 검색 결과 {posts.length}건
            </Text>
          }
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <View style={s.footerLoader}>
                <ActivityIndicator color="#0d9488" />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ResultCard
              post={item}
              term={term}
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

function ResultCard({
  post,
  term,
  liked,
  onPress,
}: {
  post: PostRow;
  term: string;
  liked: boolean;
  onPress: () => void;
}) {
  const toggle = useToggleLike();
  const authorName = post.author?.display_name ?? post.author?.username ?? '익명';
  const firstChar = authorName[0]?.toUpperCase() ?? '?';
  const avatarUrl = post.author?.avatar_url;
  const badge = BADGE_COLORS[post.post_type] ?? BADGE_COLORS.general;
  const label =
    post.post_type === 'meetup'
      ? '모임'
      : POST_TYPE_LABEL[post.post_type as Exclude<PostType, 'meetup'>];
  const firstImage = post.image_urls[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, { backgroundColor: pressed ? '#f8fafc' : '#fff' }]}
    >
      <View style={s.cardHead}>
        <View style={[s.avatar, { backgroundColor: getAvatarBg(authorName) }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatarImage} />
          ) : (
            <Text style={[s.avatarText, { color: getAvatarFg(authorName) }]}>{firstChar}</Text>
          )}
        </View>
        <Text style={s.authorName} numberOfLines={1}>
          {authorName}
        </Text>
        <View style={[s.badge, { backgroundColor: badge.bg }]}>
          <Text style={[s.badgeText, { color: badge.text }]}>{label}</Text>
        </View>
        <Text style={s.time}>{formatRelativeTime(post.created_at)}</Text>
      </View>

      {!!post.title && (
        <Highlighted text={post.title} term={term} style={s.title} numberOfLines={2} />
      )}
      <Highlighted text={post.body} term={term} style={s.body} numberOfLines={3} />

      {!!firstImage && (
        <View style={s.thumbWrap}>
          <Image source={{ uri: firstImage }} style={s.thumb} resizeMode="cover" />
        </View>
      )}

      <View style={s.metricsRow}>
        <Pressable
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            if (!toggle.isPending) toggle.mutate({ postId: post.id, currentlyLiked: liked });
          }}
          style={({ pressed }) => [s.metricBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="heart" size={15} color={liked ? '#ef4444' : '#94a3b8'} />
          <Text style={[s.metricCount, liked && { color: '#ef4444' }]}>{post.like_count}</Text>
        </Pressable>
        <View style={s.metricBtn}>
          <Feather name="message-circle" size={15} color="#94a3b8" />
          <Text style={s.metricCount}>{post.comment_count}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Highlighted({
  text,
  term,
  style,
  numberOfLines,
}: {
  text: string;
  term: string;
  style: object;
  numberOfLines?: number;
}) {
  if (!term) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }
  const lower = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const found = lower.indexOf(lowerTerm, i);
    if (found === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (found > i) parts.push(text.slice(i, found));
    parts.push(
      <Text key={`m-${found}`} style={s.highlight}>
        {text.slice(found, found + term.length)}
      </Text>,
    );
    i = found + term.length;
  }
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts}
    </Text>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  placeholderIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  placeholderTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  placeholderBody: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBox: {
    margin: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  resultsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  footerLoader: { paddingVertical: 16 },

  card: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 13, fontWeight: '800' },
  authorName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  time: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },

  title: { fontSize: 14, fontWeight: '800', color: '#0f172a', lineHeight: 20, marginBottom: 4 },
  body: { fontSize: 13, color: '#475569', lineHeight: 19, marginBottom: 10 },
  highlight: { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '700' },

  thumbWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 10,
  },
  thumb: { width: '100%', height: 160 },

  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  metricBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metricCount: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
});
