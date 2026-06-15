/**
 * 내 커뮤니티 — 내가 쓴 글 + 내가 남긴 댓글 보기.
 * 각 row 탭하면 해당 글로 이동.
 */
import { useRouter } from '@/lib/router';
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
import { POST_TYPE_LABEL, useMyComments, useMyJoinedMeetups, useMyPosts, type PostRow } from '@/hooks/use-community';
import { useMyBattles, type Battle } from '@/hooks/use-battles';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type Tab = 'posts' | 'comments' | 'events';

type EventItem = {
  kind: 'battle' | 'meetup';
  id: string;
  title: string;
  date: string;   // ISO or YYYY-MM-DD
  badge: string;
  badgeAccent: string;
  sub: string | null;    // crew name (battle) or location (meetup)
  isPast: boolean;
  statusLabel: string;   // D-N, D-Day, 진행 중, 종료, 날짜
};

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
  const myBattles = useMyBattles();
  const myMeetups = useMyJoinedMeetups();

  const events = React.useMemo<EventItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = Date.now();
    const result: EventItem[] = [];

    for (const b of myBattles.data ?? []) {
      const d = new Date(`${b.battle_date}T00:00:00`);
      const isPast = b.status === 'ended' || b.status === 'declined' || (b.status === 'scheduled' && d < today);
      let statusLabel: string;
      if (b.status === 'active') statusLabel = '진행 중';
      else if (b.status === 'ended' || b.status === 'declined') statusLabel = '종료';
      else {
        const dday = Math.ceil((d.getTime() - today.getTime()) / 86400000);
        statusLabel = dday === 0 ? 'D-Day' : `D-${dday}`;
      }
      result.push({
        kind: 'battle',
        id: b.id,
        title: b.title,
        date: b.battle_date,
        badge: '크루 대결',
        badgeAccent: '#ef4444',
        sub: b.crew?.name ?? null,
        isPast,
        statusLabel,
      });
    }

    for (const m of myMeetups.data ?? []) {
      if (!m.meetup_at) continue;
      const d = new Date(m.meetup_at);
      const isPast = d.getTime() < now;
      let statusLabel: string;
      if (isPast) {
        statusLabel = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      } else {
        const meetupDay = new Date(d);
        meetupDay.setHours(0, 0, 0, 0);
        const dday = Math.ceil((meetupDay.getTime() - today.getTime()) / 86400000);
        statusLabel = dday === 0 ? 'D-Day' : `D-${dday}`;
      }
      result.push({
        kind: 'meetup',
        id: m.id,
        title: m.title ?? m.body.slice(0, 40),
        date: m.meetup_at,
        badge: m.crew_id ? '크루 모임' : '모임',
        badgeAccent: m.crew_id ? '#7c3aed' : '#2563eb',
        sub: m.meetup_location ?? null,
        isPast,
        statusLabel,
      });
    }

    // 다가오는 먼저(가까운 순), 그 다음 지난 것(최근 종료 순)
    const upcoming = result.filter((e) => !e.isPast).sort((a, b) => a.date.localeCompare(b.date));
    const past = result.filter((e) => e.isPast).sort((a, b) => b.date.localeCompare(a.date));
    return [...upcoming, ...past];
  }, [myBattles.data, myMeetups.data]);

  const count =
    tab === 'posts'
      ? (myPosts.data?.length ?? 0)
      : tab === 'comments'
      ? (myComments.data?.length ?? 0)
      : events.length;

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
                댓글 {myComments.data ? `· ${myComments.data.length}` : ''}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => setTab('events')} style={{ flex: 1 }}>
          {({ pressed }) => (
            <View style={[s.tabItem, tab === 'events' && s.tabItemActive, pressed && { opacity: 0.7 }]}>
              <Text style={[s.tabText, tab === 'events' && s.tabTextActive]}>
                모임·대결 {events.length > 0 ? `· ${events.length}` : ''}
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
        ) : tab === 'comments' ? (
          myComments.isLoading ? (
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
          )
        ) : (myBattles.isLoading || myMeetups.isLoading) ? (
          <ActivityIndicator color={c.brand.primary} style={{ marginTop: 32 }} />
        ) : events.length === 0 ? (
          <EmptyView
            icon="calendar"
            title="참여한 모임·대결이 없어요"
            desc="커뮤니티에서 모임에 참가하거나 크루에서 대결을 시작해보세요"
            c={c}
          />
        ) : (
          <EventsList events={events} router={router} c={c} />
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

function EventsList({
  events,
  router,
  c,
}: {
  events: EventItem[];
  router: ReturnType<typeof useRouter>;
  c: ThemeColors;
}) {
  const s = makeStyles(c);
  const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  function formatEventDate(iso: string): string {
    const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${KO_DAYS[d.getDay()]})`;
  }

  const upcoming = events.filter((e) => !e.isPast);
  const past = events.filter((e) => e.isPast);

  function renderRow(ev: EventItem, i: number, arr: EventItem[]) {
    return (
      <Pressable
        key={`${ev.kind}-${ev.id}`}
        onPress={() =>
          router.push(
            ev.kind === 'battle'
              ? { pathname: '/battle/[id]', params: { id: ev.id } }
              : { pathname: '/community/[id]', params: { id: ev.id } },
          )
        }
      >
        {({ pressed }) => (
          <View
            style={[
              s.row,
              !ev.isPast && i < arr.length - 1 && s.rowDivider,
              ev.isPast && i < arr.length - 1 && s.rowDivider,
              pressed && { backgroundColor: c.bg.subtle },
            ]}
          >
            <View style={[s.typeBadge, { backgroundColor: ev.badgeAccent + '22' }]}>
              <Text style={[s.typeBadgeText, { color: ev.badgeAccent }]}>{ev.badge}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10, gap: 3 }}>
              <Text style={s.rowTitle} numberOfLines={1}>{ev.title}</Text>
              <View style={s.metaRow}>
                <Text style={s.metaText}>{formatEventDate(ev.date)}</Text>
                {ev.sub && (
                  <Text style={[s.metaText, { marginLeft: 6 }]}>· {ev.sub}</Text>
                )}
              </View>
            </View>
            <View
              style={[
                s.statusChip,
                ev.statusLabel === '진행 중'
                  ? { backgroundColor: '#16a34a22' }
                  : ev.isPast
                  ? { backgroundColor: c.bg.subtle }
                  : { backgroundColor: ev.badgeAccent + '18' },
              ]}
            >
              <Text
                style={[
                  s.statusChipText,
                  {
                    color:
                      ev.statusLabel === '진행 중'
                        ? '#16a34a'
                        : ev.isPast
                        ? c.text.muted
                        : ev.badgeAccent,
                  },
                ]}
              >
                {ev.statusLabel}
              </Text>
            </View>
            <Feather name="chevron-right" size={15} color={c.text.muted} style={{ marginLeft: 4 }} />
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {upcoming.length > 0 && (
        <View>
          <Text style={s.sectionDividerLabel}>다가오는</Text>
          <View style={s.rowGroup}>{upcoming.map((e, i, a) => renderRow(e, i, a))}</View>
        </View>
      )}
      {past.length > 0 && (
        <View>
          <Text style={s.sectionDividerLabel}>지난</Text>
          <View style={[s.rowGroup, { opacity: 0.75 }]}>{past.map((e, i, a) => renderRow(e, i, a))}</View>
        </View>
      )}
    </View>
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

    sectionDividerLabel: {
      fontSize: 11, fontWeight: '900', color: c.text.tertiary,
      letterSpacing: 0.6, textTransform: 'uppercase',
      paddingHorizontal: 4, marginBottom: 6,
    },
    statusChip: {
      paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    },
    statusChipText: {
      fontSize: 11, fontWeight: '900',
    },
  });
}
