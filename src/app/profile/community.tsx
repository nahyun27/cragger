/**
 * 내 커뮤니티 — 내가 쓴 글 + 내가 남긴 댓글 보기.
 * 각 row 탭하면 해당 글로 이동.
 */
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ui/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { POST_TYPE_LABEL, useMyComments, useMyPosts, type PostRow } from '@/hooks/use-community';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type Tab = 'posts' | 'comments';

function relativeDate(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function MyCommunityScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('posts');
  const myPosts = useMyPosts();
  const myComments = useMyComments();

  const count =
    tab === 'posts' ? (myPosts.data?.length ?? 0) : (myComments.data?.length ?? 0);

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="내 커뮤니티" onBack={() => router.back()} count={count} />

      {/* Tabs */}
      <View style={s.tabBar}>
        <Pressable onPress={() => setTab('posts')} style={{ flex: 1 }}>
          {({ pressed }) => (
            <View style={[s.tabItem, tab === 'posts' && s.tabItemActive, pressed && { opacity: 0.7 }]}>
              <Text style={[s.tabText, tab === 'posts' && s.tabTextActive]}>
                내 글 {myPosts.data ? `· ${myPosts.data.length}` : ''}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => setTab('comments')} style={{ flex: 1 }}>
          {({ pressed }) => (
            <View style={[s.tabItem, tab === 'comments' && s.tabItemActive, pressed && { opacity: 0.7 }]}>
              <Text style={[s.tabText, tab === 'comments' && s.tabTextActive]}>
                내 댓글 {myComments.data ? `· ${myComments.data.length}` : ''}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'posts' ? (
          myPosts.isLoading ? (
            <ActivityIndicator color={c.brand.primary} style={{ marginTop: 32 }} />
          ) : (myPosts.data ?? []).length === 0 ? (
            <EmptyView
              icon="edit-3"
              title="쓴 글이 없어요"
              desc="커뮤니티에서 첫 글을 남겨 보세요"
              c={c}
            />
          ) : (
            <View style={s.rowGroup}>
              {(myPosts.data ?? []).map((p, i, arr) => (
                <PostListRow
                  key={p.id}
                  post={p}
                  isLast={i === arr.length - 1}
                  onPress={() => router.push({ pathname: '/community/[id]', params: { id: p.id } })}
                  c={c}
                />
              ))}
            </View>
          )
        ) : myComments.isLoading ? (
          <ActivityIndicator color={c.brand.primary} style={{ marginTop: 32 }} />
        ) : (myComments.data ?? []).length === 0 ? (
          <EmptyView
            icon="message-circle"
            title="남긴 댓글이 없어요"
            desc="다른 사람 글에 댓글을 남겨 보세요"
            c={c}
          />
        ) : (
          <View style={s.rowGroup}>
            {(myComments.data ?? []).map((cm, i, arr) => (
              <CommentListRow
                key={cm.id}
                row={cm}
                isLast={i === arr.length - 1}
                onPress={() =>
                  router.push({ pathname: '/community/[id]', params: { id: cm.post_id } })
                }
                c={c}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PostListRow({
  post, isLast, onPress, c,
}: {
  post: PostRow;
  isLast: boolean;
  onPress: () => void;
  c: ThemeColors;
}) {
  const s = makeStyles(c);
  const label =
    POST_TYPE_LABEL[post.post_type as keyof typeof POST_TYPE_LABEL] ?? post.post_type;
  const preview = post.title ?? post.body;
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            s.row,
            !isLast && s.rowDivider,
            pressed && { backgroundColor: c.bg.subtle },
          ]}
        >
          <View style={[s.typeBadge, { backgroundColor: c.brand.primaryLight }]}>
            <Text style={[s.typeBadgeText, { color: c.brand.primaryDeep }]}>{label}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10, gap: 3 }}>
            <Text style={s.rowTitle} numberOfLines={1}>{preview}</Text>
            <View style={s.metaRow}>
              <Feather name="heart" size={10} color={c.text.muted} />
              <Text style={s.metaText}>{post.like_count ?? 0}</Text>
              <Feather name="message-circle" size={10} color={c.text.muted} style={{ marginLeft: 8 }} />
              <Text style={s.metaText}>{post.comment_count ?? 0}</Text>
              <Text style={[s.metaText, { marginLeft: 8 }]}>· {relativeDate(post.created_at)}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={15} color={c.text.muted} />
        </View>
      )}
    </Pressable>
  );
}

function CommentListRow({
  row, isLast, onPress, c,
}: {
  row: { id: string; body: string; created_at: string; parent_comment_id: string | null; post: { title: string | null; body: string } | null };
  isLast: boolean;
  onPress: () => void;
  c: ThemeColors;
}) {
  const s = makeStyles(c);
  const postPreview = row.post?.title ?? row.post?.body ?? '(원글 없음)';
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            s.row,
            !isLast && s.rowDivider,
            pressed && { backgroundColor: c.bg.subtle },
          ]}
        >
          <View style={[s.typeBadge, { backgroundColor: c.bg.subtle }]}>
            <Feather
              name={row.parent_comment_id ? 'corner-down-right' : 'message-circle'}
              size={12}
              color={c.text.tertiary}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10, gap: 4 }}>
            <Text style={s.commentBody} numberOfLines={2}>{row.body}</Text>
            <Text style={s.commentPost} numberOfLines={1}>
              원글: {postPreview}
            </Text>
            <Text style={s.metaText}>{relativeDate(row.created_at)}</Text>
          </View>
          <Feather name="chevron-right" size={15} color={c.text.muted} />
        </View>
      )}
    </Pressable>
  );
}

function EmptyView({ icon, title, desc }: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
  c: ThemeColors;  // legacy prop, ignored
}) {
  return <EmptyState icon={icon} title={title} description={desc} />;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    tabBar: {
      flexDirection: 'row',
      paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
      gap: 6,
    },
    tabItem: {
      paddingVertical: 9, borderRadius: 12,
      alignItems: 'center',
      backgroundColor: c.bg.subtle,
    },
    tabItemActive: { backgroundColor: c.brand.primary },
    tabText: { fontSize: 13, fontWeight: '800', color: c.text.secondary, letterSpacing: -0.2 },
    tabTextActive: { color: c.brand.onPrimary, fontWeight: '900' },

    list: { padding: 18, gap: 16, paddingBottom: 12 },
    rowGroup: {
      backgroundColor: c.bg.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 14,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
    },
    typeBadge: {
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center', minWidth: 36,
    },
    typeBadgeText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.2 },
    rowTitle: { fontSize: 13.5, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2 },
    metaRow: { flexDirection: 'row', alignItems: 'center' },
    metaText: { fontSize: 11, color: c.text.muted, fontWeight: '700', marginLeft: 3 },
    commentBody: { fontSize: 13, color: c.text.primary, fontWeight: '700', lineHeight: 18 },
    commentPost: { fontSize: 11, color: c.text.tertiary, fontWeight: '600' },

    emptyBox: { alignItems: 'center', paddingVertical: 56, gap: 10 },
    emptyIcon: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: c.brand.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { fontSize: 15, fontWeight: '900', color: c.text.primary },
    emptySub: { fontSize: 12, color: c.text.tertiary, fontWeight: '600', textAlign: 'center' },
  });
}
