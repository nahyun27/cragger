import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
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

type FilterKey = 'all' | Exclude<PostType, 'meetup'>;

const FILTER_TABS: {
  key: FilterKey;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}[] = [
  { key: 'all', label: '전체', icon: 'layers' },
  { key: 'general', label: POST_TYPE_LABEL.general, icon: 'message-circle' },
  { key: 'question', label: POST_TYPE_LABEL.question, icon: 'help-circle' },
  { key: 'review', label: POST_TYPE_LABEL.review, icon: 'star' },
];

const BADGE_CONFIG: Record<string, { accent: string; label: string }> = {
  general: { accent: '#6366f1', label: '일반' },
  question: { accent: '#8b5cf6', label: '질문' },
  review: { accent: '#10b981', label: '후기' },
  meetup: { accent: '#f59e0b', label: '모임' },
};

const AVATAR_BG = ['#e0e7ff', '#fce7f3', '#d1fae5', '#fef9c3', '#fee2e2', '#e0f2fe'];
const AVATAR_FG = ['#4338ca', '#be185d', '#065f46', '#854d0e', '#b91c1c', '#0369a1'];

function hashIndex(name: string, len: number) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return sum % len;
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

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ─────────────────────────────────────────────────────────────
export default function CommunityScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchInput, setSearchInput] = useState('');
  const searchTerm = useDebounced(searchInput.trim(), 300);
  const feed = useCommunityFeed(filter, searchTerm);
  const { data: likedSet } = useMyLikes();
  const posts = useMemo<PostRow[]>(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const isSearching = searchTerm.length > 0;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* HEADER */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>커뮤니티</Text>
          <Text style={s.headerSub}>클라이머들의 소통 공간</Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Feather name="search" size={16} color="#94a3b8" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="제목·본문 검색"
            placeholderTextColor="#94a3b8"
            style={s.searchInput}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
              <Feather name="x-circle" size={16} color="#94a3b8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* TAB FILTER */}
      <View style={s.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsScroll}
        >
          {FILTER_TABS.map((t) => {
            const active = filter === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setFilter(t.key)}
                style={({ pressed }) => [s.tab, active && s.tabActive, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name={t.icon} size={13} color={active ? '#0d9488' : '#94a3b8'} />
                <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* CONTENT */}
      {feed.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : feed.error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{feed.error.message}</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Feather name={isSearching ? 'search' : 'message-square'} size={28} color="#94a3b8" />
          </View>
          <Text style={s.emptyTitle}>
            {isSearching ? '검색 결과가 없어요' : '아직 글이 없어요'}
          </Text>
          <Text style={s.emptyBody}>
            {isSearching
              ? '다른 단어로 검색해보세요'
              : '클라이머들의 첫 이야기를\n여기서 시작해보세요!'}
          </Text>
          {!isSearching && (
            <Pressable
              onPress={() => router.push('/community/new')}
              style={({ pressed }) => [s.emptyBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={s.emptyBtnText}>첫 글 쓰기</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          style={s.list}
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshing={feed.isRefetching}
          onRefresh={() => feed.refetch()}
          ItemSeparatorComponent={() => <View style={s.separator} />}
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
              highlight={searchTerm}
              onPress={() =>
                router.push({ pathname: '/community/[id]', params: { id: item.id } })
              }
            />
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/community/new')}
        style={({ pressed }) => [s.fab, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Feather name="edit-3" size={20} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
function PostCard({
  post,
  liked,
  highlight,
  onPress,
}: {
  post: PostRow;
  liked: boolean;
  highlight: string;
  onPress: () => void;
}) {
  const toggle = useToggleLike();
  const authorName = post.author?.display_name ?? post.author?.username ?? '익명';
  const firstChar = authorName.charAt(0).toUpperCase() || '?';
  const idx = hashIndex(authorName, AVATAR_BG.length);
  const badge = BADGE_CONFIG[post.post_type] ?? BADGE_CONFIG.general;
  const firstImage = post.image_urls[0];
  const avatarUrl = post.author?.avatar_url;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, { backgroundColor: pressed ? '#f8fafc' : '#fff' }]}
    >
      {/* Avatar */}
      <View style={[s.avatar, { backgroundColor: AVATAR_BG[idx] }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={s.avatarImage} resizeMode="cover" />
        ) : (
          <Text style={[s.avatarText, { color: AVATAR_FG[idx] }]}>{firstChar}</Text>
        )}
      </View>

      {/* Content */}
      <View style={s.cardContent}>
        {/* Name row */}
        <View style={s.nameRow}>
          <Text style={s.authorName} numberOfLines={1}>
            {authorName}
          </Text>
          <View style={[s.accentDot, { backgroundColor: badge.accent }]} />
          <Text style={s.badgeLabel}>{badge.label}</Text>
          <View style={s.nameSpacer} />
          <Text style={s.timestamp}>{formatRelativeTime(post.created_at)}</Text>
        </View>

        {/* Title */}
        {!!post.title && (
          <HighlightedText
            text={post.title}
            term={highlight}
            style={s.postTitle}
            numberOfLines={2}
          />
        )}

        {/* Body */}
        <HighlightedText
          text={post.body}
          term={highlight}
          style={s.postBody}
          numberOfLines={4}
        />

        {/* Image */}
        {!!firstImage && (
          <View style={s.imageWrapper}>
            <Image source={{ uri: firstImage }} style={s.postImage} resizeMode="cover" />
          </View>
        )}

        {/* Gym tag */}
        {!!post.gym && (
          <View style={s.gymTag}>
            <Feather name="map-pin" size={10} color="#94a3b8" />
            <Text style={s.gymTagText}>
              {post.gym.name}
              {post.gym.branch ? ` ${post.gym.branch}` : ''}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={s.actions}>
          <Pressable
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              if (!toggle.isPending) toggle.mutate({ postId: post.id, currentlyLiked: liked });
            }}
            style={({ pressed }) => [s.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="heart" size={16} color={liked ? '#ef4444' : '#94a3b8'} />
            <Text style={[s.actionCount, liked && { color: '#ef4444' }]}>{post.like_count}</Text>
          </Pressable>

          <View style={s.actionBtn}>
            <Feather name="message-circle" size={16} color="#94a3b8" />
            <Text style={s.actionCount}>{post.comment_count}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function HighlightedText({
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

// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.8 },
  headerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },

  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },

  tabsWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabsScroll: { paddingHorizontal: 16, flexDirection: 'row' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#0d9488' },
  tabLabel: { fontSize: 14, fontWeight: '500', color: '#94a3b8' },
  tabLabelActive: { fontWeight: '800', color: '#0d9488' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  errorBox: {
    margin: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  emptyBody: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#0d9488',
    marginTop: 4,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  list: { flex: 1 },
  listContent: { paddingBottom: 120 },
  separator: { height: 1, backgroundColor: '#f1f5f9' },
  footerLoader: { paddingVertical: 24 },

  card: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontWeight: '800', fontSize: 16 },
  cardContent: { flex: 1, minWidth: 0 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  authorName: { fontWeight: '800', fontSize: 14, color: '#0f172a', flexShrink: 1 },
  accentDot: { width: 4, height: 4, borderRadius: 2, flexShrink: 0 },
  badgeLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', flexShrink: 0 },
  nameSpacer: { flex: 1 },
  timestamp: { fontSize: 11, color: '#cbd5e1', fontWeight: '500', flexShrink: 0 },

  postTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  postBody: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 10 },
  highlight: { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '700' },

  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  postImage: { width: '100%', height: 200 },

  gymTag: {
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
  },
  gymTagText: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d9488',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
});
