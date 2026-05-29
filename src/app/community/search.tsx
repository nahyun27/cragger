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
import { useSearchUsers, type SearchUser } from '@/hooks/use-follows';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

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

type SearchTab = 'posts' | 'users';

export default function CommunitySearchScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const router = useRouter();
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<SearchTab>('posts');
  const term = useDebounced(input.trim(), 300);
  const feed = useCommunityFeed('all', tab === 'posts' ? term : '');
  const { data: likedSet } = useMyLikes();
  const posts = useMemo<PostRow[]>(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const usersQ = useSearchUsers(tab === 'users' ? term : '', 40);

  const hasTerm = term.length > 0;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={22} color={c.text.primary} />
        </Pressable>
        <View style={s.searchBox}>
          <Feather name="search" size={16} color={c.text.muted} />
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={tab === 'posts' ? '제목·본문 검색' : '이름·아이디 검색'}
            placeholderTextColor={c.text.muted}
            style={s.searchInput}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
          />
          {input.length > 0 && (
            <Pressable onPress={() => setInput('')} hitSlop={8}>
              <Feather name="x-circle" size={16} color={c.text.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* 탭 전환 */}
      <View style={s.tabBar}>
        {(['posts', 'users'] as SearchTab[]).map((t) => (
          <Pressable key={t} style={s.tabItem} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'posts' ? '글' : '사람'}
            </Text>
            {tab === t && <View style={s.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      {!hasTerm ? (
        <View style={s.placeholderWrap}>
          <View style={s.placeholderIcon}>
            <Feather name="search" size={28} color={c.text.muted} />
          </View>
          <Text style={s.placeholderTitle}>
            {tab === 'posts' ? '커뮤니티 검색' : '사람 검색'}
          </Text>
          <Text style={s.placeholderBody}>
            {tab === 'posts'
              ? '제목이나 본문에 들어간 단어로\n글을 찾을 수 있어요'
              : '닉네임이나 표시 이름으로\n사용자를 찾을 수 있어요'}
          </Text>
        </View>
      ) : tab === 'users' ? (
        usersQ.isLoading ? (
          <View style={s.centerWrap}><ActivityIndicator color={c.brand.primary} /></View>
        ) : usersQ.error ? (
          <View style={s.errorBox}><Text style={s.errorText}>{usersQ.error.message}</Text></View>
        ) : !usersQ.data || usersQ.data.length === 0 ? (
          <View style={s.placeholderWrap}>
            <View style={s.placeholderIcon}>
              <Feather name="user-x" size={28} color={c.text.muted} />
            </View>
            <Text style={s.placeholderTitle}>일치하는 사용자가 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={usersQ.data}
            keyExtractor={(u) => u.id}
            contentContainerStyle={s.listContent}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={s.userRowDivider} />}
            renderItem={({ item }) => (
              <UserSearchRow user={item} onPress={() => router.push({ pathname: '/u/[id]', params: { id: item.id } } as never)} />
            )}
          />
        )
      ) : feed.isLoading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator color={c.brand.primary} />
        </View>
      ) : feed.error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{feed.error.message}</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={s.placeholderWrap}>
          <View style={s.placeholderIcon}>
            <Feather name="frown" size={28} color={c.text.muted} />
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
                <ActivityIndicator color={c.brand.primary} />
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
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

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
          <Text style={[s.metricCount, liked && { color: c.status.danger }]}>{post.like_count}</Text>
        </Pressable>
        <View style={s.metricBtn}>
          <Feather name="message-circle" size={15} color={c.text.muted} />
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
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

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

function UserSearchRow({ user, onPress }: { user: SearchUser; onPress: () => void }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const name = user.display_name || user.username;
  const firstChar = name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  const bg = getAvatarBg(name);
  const fg = getAvatarFg(name);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.userRow, pressed && { opacity: 0.7 }]}>
      <View style={[s.userAvatar, { backgroundColor: bg }]}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={s.userAvatarImg} />
        ) : (
          <Text style={[s.userAvatarText, { color: fg }]}>{firstChar}</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={s.userName} numberOfLines={1}>{name}</Text>
          {user.is_private && <Feather name="lock" size={10} color={c.text.tertiary} />}
        </View>
        <Text style={s.userHandle} numberOfLines={1}>@{user.username}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={c.text.muted} />
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg.primary },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: c.bg.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border.subtle,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.text.muted,
  },
  tabTextActive: {
    color: c.text.primary,
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.brand.primary,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: c.bg.card,
  },
  userRowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border.subtle,
    marginLeft: 76,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImg: { width: '100%', height: '100%' },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text.primary,
  },
  userHandle: {
    fontSize: 12,
    color: c.text.tertiary,
    fontWeight: '600',
  },

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
    backgroundColor: c.bg.subtle,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: c.text.primary,
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
    borderColor: c.border.subtle,
  },
  placeholderTitle: { fontSize: 16, fontWeight: '800', color: c.text.primary },
  placeholderBody: {
    fontSize: 12,
    color: c.text.tertiary,
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
  errorText: { color: c.status.danger, fontSize: 13, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  resultsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.tertiary,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  footerLoader: { paddingVertical: 16 },

  card: {
    borderWidth: 1,
    borderColor: c.border.subtle,
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
  authorName: { flex: 1, fontSize: 13, fontWeight: '700', color: c.text.primary },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  time: { fontSize: 10, color: c.text.muted, fontWeight: '600' },

  title: { fontSize: 14, fontWeight: '800', color: c.text.primary, lineHeight: 20, marginBottom: 4 },
  body: { fontSize: 13, color: c.text.secondary, lineHeight: 19, marginBottom: 10 },
  highlight: { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '700' },

  thumbWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border.subtle,
    marginBottom: 10,
  },
  thumb: { width: '100%', height: 160 },

  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  metricBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metricCount: { fontSize: 12, fontWeight: '700', color: c.text.muted },
  });
}