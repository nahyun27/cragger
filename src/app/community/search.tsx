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
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/empty-state';
import { Feather } from '@expo/vector-icons';

import {
  POST_TYPE_LABEL,
  useCommunityFeed,
  type PostRow,
  type PostType,
} from '@/hooks/use-community';
import { useSearchUsers, type SearchUser } from '@/hooks/use-follows';
import { FeaturedBadgeChip } from '@/components/ui/featured-badge-chip';
import { useThemeColors, type ThemeColors, useEffectiveScheme } from '@/lib/theme';

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  general: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  question: { bg: 'rgba(147, 51, 234, 0.15)', text: '#a855f7' },
  review: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  meetup: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
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
  const posts = useMemo<PostRow[]>(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const usersQ = useSearchUsers(tab === 'users' ? term : '', 40);

  const hasTerm = term.length > 0;

  const insets = useSafeAreaInsets();
  const scheme = useEffectiveScheme();

  return (
    <View style={s.container}>
      {/* Glassmorphic Header */}
      <View className="z-20 border-b border-border-subtle absolute top-0 left-0 right-0" style={{ paddingTop: Math.max(insets.top, 20), backgroundColor: scheme === 'dark' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.75)' }}>
        <BlurView
          tint={scheme === 'dark' ? 'dark' : 'light'}
          intensity={80}
          style={StyleSheet.absoluteFill}
        />
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

        {/* 탭 전환 (Segmented Control Style) */}
        <View style={s.tabBarWrap}>
          <View style={s.tabBar}>
            {(['posts', 'users'] as SearchTab[]).map((t) => (
              <Pressable key={t} style={[s.tabItem, tab === t && s.tabItemActive]} onPress={() => setTab(t)}>
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                  {t === 'posts' ? '글 검색' : '사람 찾기'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {!hasTerm ? (
        <View style={{ paddingTop: Math.max(insets.top, 20) + 160 }}>
          <EmptyState
            icon="search"
            title={tab === 'posts' ? '어떤 글을 찾고 계신가요?' : '누구를 찾고 계신가요?'}
            description={tab === 'posts'
              ? '제목이나 본문에 포함된 단어로 검색해 보세요.'
              : '닉네임이나 표시 이름으로 사용자를 검색해 보세요.'}
          />
        </View>
      ) : tab === 'users' ? (
        usersQ.isLoading ? (
          <View style={s.centerWrap}><ActivityIndicator color={c.brand.primary} /></View>
        ) : usersQ.error ? (
          <View style={s.errorBox}><Text style={s.errorText}>{usersQ.error.message}</Text></View>
        ) : !usersQ.data || usersQ.data.length === 0 ? (
          <View style={{ paddingTop: Math.max(insets.top, 20) + 160 }}>
            <EmptyState
              icon="user-x"
              tone="danger"
              title="일치하는 사용자가 없어요"
              description="철자가 정확한지 다시 한 번 확인해 보세요."
            />
          </View>
        ) : (
          <FlatList
            data={usersQ.data}
            keyExtractor={(u) => u.id}
            contentContainerStyle={[s.listContent, { paddingTop: Math.max(insets.top, 20) + 160, paddingBottom: insets.bottom + 12 }]}
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            keyboardShouldPersistTaps="handled"
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
        <View style={{ paddingTop: Math.max(insets.top, 20) + 160 }}>
          <EmptyState
            icon="frown"
            tone="warning"
            title="검색 결과가 없어요"
            description="다른 검색어를 입력해 보세요."
          />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[s.listContent, { paddingTop: Math.max(insets.top, 20) + 160, paddingBottom: insets.bottom + 12 }]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
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
              onPress={() =>
                router.push({ pathname: '/community/[id]', params: { id: item.id } })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function ResultCard({
  post,
  term,
  onPress,
}: {
  post: PostRow;
  term: string;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

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
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={[s.card, pressed && { backgroundColor: c.bg.subtle }]}>
          {/* Type badge + time on top */}
          <View style={s.cardTopRow}>
            <View style={[s.badge, { backgroundColor: badge.bg }]}>
              <Text style={[s.badgeText, { color: badge.text }]}>{label}</Text>
            </View>
            <Text style={s.time}>{formatRelativeTime(post.created_at)}</Text>
          </View>

          {/* Title / body */}
          {!!post.title && (
            <Highlighted text={post.title} term={term} style={s.title} numberOfLines={2} />
          )}
          <Highlighted text={post.body} term={term} style={s.body} numberOfLines={3} />

          {/* Thumbnail */}
          {!!firstImage && (
            <View style={s.thumbWrap}>
              <Image source={{ uri: firstImage }} style={s.thumb} resizeMode="cover" />
            </View>
          )}

          {/* Author footer */}
          <View style={s.authorFooter}>
            <View style={[s.avatar, { backgroundColor: getAvatarBg(authorName) }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={[s.avatarText, { color: getAvatarFg(authorName) }]}>{firstChar}</Text>
              )}
            </View>
            <Text style={s.authorName} numberOfLines={1}>{authorName}</Text>
            <FeaturedBadgeChip badgeKey={post.author?.featured_badge_key} size={11} />
          </View>
        </View>
      )}
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
  const hasDisplayName = !!user.display_name && user.display_name !== user.username;
  const firstChar = name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  const bg = getAvatarBg(name);
  const fg = getAvatarFg(name);
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={[s.userRow, pressed && { backgroundColor: c.bg.subtle }]}>
          <View style={[s.userAvatar, { backgroundColor: bg }]}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={s.userAvatarImg} />
            ) : (
              <Text style={[s.userAvatarText, { color: fg }]}>{firstChar}</Text>
            )}
          </View>
          <View style={s.userInfo}>
            <View style={s.userNameRow}>
              <Text style={s.userName} numberOfLines={1}>{name}</Text>
              {user.is_private && (
                <Feather name="lock" size={11} color={c.text.tertiary} />
              )}
            </View>
            {hasDisplayName && (
              <Text style={s.userHandle} numberOfLines={1}>@{user.username}</Text>
            )}
          </View>
          <Feather name="chevron-right" size={18} color={c.text.muted} />
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg.primary },
  tabBarWrap: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: c.bg.subtle,
    borderRadius: 99,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 99,
  },
  tabItemActive: {
    backgroundColor: c.bg.card,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.text.tertiary,
  },
  tabTextActive: {
    color: c.text.primary,
    fontWeight: '800',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: c.bg.card,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border.subtle,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  userAvatarImg: { width: '100%', height: '100%' },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '900',
    color: c.text.primary,
    letterSpacing: -0.2,
    marginRight: 6,
    flexShrink: 1,
  },
  userHandle: {
    fontSize: 12.5,
    color: c.text.tertiary,
    fontWeight: '700',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: c.bg.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border.subtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border.subtle,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: c.bg.card,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: c.border.subtle,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: c.text.primary,
    padding: 0,
  },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  placeholderIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.brand.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  placeholderTitle: { fontSize: 17, fontWeight: '800', color: c.text.primary, textAlign: 'center' },
  placeholderBody: {
    fontSize: 13,
    color: c.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  errorBox: {
    margin: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: c.status.dangerBg,
    borderWidth: 1,
    borderColor: c.status.danger,
  },
  errorText: { color: c.status.danger, fontSize: 13, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  resultsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.tertiary,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  footerLoader: { paddingVertical: 16 },

  card: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3 },
  time: { fontSize: 11.5, color: c.text.muted, fontWeight: '700' },

  title: {
    fontSize: 16, fontWeight: '900', color: c.text.primary,
    lineHeight: 23, letterSpacing: -0.3, marginBottom: 6,
  },
  body: {
    fontSize: 13.5, color: c.text.secondary,
    lineHeight: 19, fontWeight: '500', marginBottom: 12,
  },
  highlight: {
    color: c.brand.primary, fontWeight: '900',
    backgroundColor: c.brand.primaryLight,
  },

  thumbWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border.subtle,
    marginBottom: 12,
  },
  thumb: { width: '100%', height: 160 },

  authorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border.subtle,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 8,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 12, fontWeight: '900' },
  authorName: {
    fontSize: 12.5, fontWeight: '800',
    color: c.text.secondary, marginRight: 5,
    flexShrink: 1,
  },
  });
}