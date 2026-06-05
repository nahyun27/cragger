import { customAlert } from '@/components/ui/custom-alert';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { FeaturedBadgeChip } from '@/components/ui/featured-badge-chip';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useMemo} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

import {
  POST_TYPE_LABEL,
  useCancelMeetupJoin,
  useComments,
  useCreateComment,
  useDeleteComment,
  useDeletePost,
  useJoinMeetup,
  useMeetupParticipants,
  useMyLikes,
  useMyMeetupStatus,
  usePost,
  useToggleLike,
  useUpdateComment,
  type CommentRow,
  type MeetupParticipant,
  type PostRow,
} from '@/hooks/use-community';
import { PollWidget } from '@/components/community/poll-widget';
import { usePoll } from '@/hooks/use-polls';
import { useAuth } from '@/lib/auth-context';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 모임 일시 절대값 포맷 (2026.05.30 (토) 19:00)
function formatMeetupAbsolute(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${dd} (${w}) ${hh}:${mi}`;
}

function describeMeetupCountdown(iso: string): { label: string; tone: 'urgent' | 'past' | 'soon' | 'far' } {
  const diffHr = (new Date(iso).getTime() - Date.now()) / 3_600_000;
  if (diffHr < 0) return { label: '종료된 모임', tone: 'past' };
  if (diffHr < 6) return { label: `${Math.max(1, Math.round(diffHr))}시간 후`, tone: 'urgent' };
  if (diffHr < 48) return { label: `${Math.round(diffHr)}시간 후`, tone: 'soon' };
  const days = Math.floor(diffHr / 24);
  return { label: `D-${days}`, tone: 'far' };
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  return `${y}.${m}.${dd} (${w})`;
}

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  general: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  question: { bg: 'rgba(147, 51, 234, 0.15)', text: '#a855f7', border: 'rgba(147, 51, 234, 0.3)' },
  review: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  meetup: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
};

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

const COMMENT_MAX = 500;

export default function PostDetailScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;
  const insets = useSafeAreaInsets();

  const postQ = usePost(id);
  const pollQ = usePoll(id);
  const commentsQ = useComments(id);
  const { data: likedSet } = useMyLikes();
  const toggleLike = useToggleLike();
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const deletePost = useDeletePost();

  const [commentBody, setCommentBody] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const commentInputRef = React.useRef<TextInput>(null);

  if (postQ.isLoading) {
    return (
      <SafeAreaView style={s.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={c.brand.primary} />
      </SafeAreaView>
    );
  }

  if (postQ.error || !postQ.data) {
    return (
      <SafeAreaView style={s.errorContainer} edges={['top']}>
        <Text style={s.errorText}>
          {postQ.error?.message ?? '글을 찾을 수 없어요'}
        </Text>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const post = postQ.data;
  const liked = likedSet?.has(post.id) ?? false;
  const isMine = meId === post.author_id;

  async function handleDeletePost() {
    if (!id) return;
    customAlert('이 글을 삭제할까요?', '댓글과 좋아요도 함께 사라져요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost.mutateAsync(id);
            router.replace('/(tabs)/community');
          } catch (e) {
            customAlert('삭제 실패', e instanceof Error ? e.message : '알 수 없는 오류');
          }
        },
      },
    ]);
  }

  async function handleSubmitComment() {
    if (!id || !commentBody.trim() || createComment.isPending) return;
    try {
      await createComment.mutateAsync({
        postId: id,
        body: commentBody,
        parentCommentId: replyToId,
      });
      setCommentBody('');
      setReplyToId(null);
      setReplyToName(null);
    } catch (e) {
      customAlert('댓글 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  function startReply(c: CommentRow) {
    setReplyToId(c.parent_comment_id ?? c.id);
    setReplyToName(c.author?.display_name ?? c.author?.username ?? '익명');
    commentInputRef.current?.focus();
  }

  function cancelReply() {
    setReplyToId(null);
    setReplyToName(null);
  }

  function startEdit(c: CommentRow) {
    setEditingId(c.id);
    setEditingBody(c.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingBody('');
  }

  async function saveEdit() {
    if (!id || !editingId || !editingBody.trim() || updateComment.isPending) return;
    try {
      await updateComment.mutateAsync({
        commentId: editingId,
        body: editingBody,
        postId: id,
      });
      cancelEdit();
    } catch (e) {
      customAlert('수정 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  const menuItems: ActionMenuItem[] = [
    {
      icon: 'share-2', label: '공유',
      onPress: async () => {
        try {
          await Share.share({
            message: `${post.title ?? '커뮤니티 글'}\n\n${post.body.slice(0, 120)}`,
          });
        } catch { /* user cancelled */ }
      },
    },
    ...(isMine ? [
      {
        icon: 'edit-3' as const, label: '수정',
        onPress: () => router.push({ pathname: '/community/[id]/edit', params: { id: id! } }),
      },
      {
        icon: 'trash-2' as const, label: '삭제', tone: 'danger' as const,
        loading: deletePost.isPending,
        onPress: handleDeletePost,
      },
    ] : []),
  ];

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader
        title="상세 보기"
        onBack={() => router.back()}
        rightActions={[{ icon: 'more-vertical', onPress: () => setMenuOpen(true) }]}
      />

      <ActionMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.bg.primary }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
        >
          {/* Post card (mirrors feed card style) */}
          <View style={s.postCard}>
            <PostHeader post={post} />

            {/* Meetup info card — date / location / capacity + 참가 CTA */}
            {post.post_type === 'meetup' && (
              <MeetupInfoCard post={post} isMine={isMine} />
            )}

            {/* Location pill above title — wrapped in a flex-row container
                so the Pressable can hug its content width inside the column
                postCard. */}
            {post.gym && (
              <View style={s.gymPillRow}>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/gym/[id]', params: { id: post.gym!.id } })
                  }
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <View style={s.gymPill}>
                    <Feather name="map-pin" size={11} color={c.text.tertiary} />
                    <Text style={s.gymPillText} numberOfLines={1}>
                      {post.gym.name}
                      {post.gym.branch ? ` ${post.gym.branch}` : ''}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {post.title && <Text style={s.postTitle}>{post.title}</Text>}

            <Text style={s.postBody}>{post.body}</Text>

            {pollQ.data && (
              <View style={{ marginTop: 14 }}>
                <PollWidget poll={pollQ.data} />
              </View>
            )}

            {post.image_urls.length > 0 && (
              <View style={s.imageGrid}>
                {post.image_urls.map((url, i) => (
                  <View key={`${url}-${i}`} style={s.imageWrapper}>
                    <Image
                      source={{ uri: url }}
                      style={s.postImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Metric row inside the card */}
            <View style={s.cardSeparator} />
            <View style={s.metricsRow}>
              <Pressable
                onPress={() => {
                  if (toggleLike.isPending) return;
                  toggleLike.mutate({ postId: post.id, currentlyLiked: liked });
                }}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <View style={s.metricBtn}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#ef4444' : '#64748b'} />
                  <Text
                    style={[s.metricText, liked && s.metricTextLiked]}
                    numberOfLines={1}
                  >{post.like_count}</Text>
                </View>
              </Pressable>
              <View style={s.metricBtn}>
                <Feather name="message-circle" size={18} color={c.text.tertiary} />
                <Text style={s.metricText} numberOfLines={1}>{post.comment_count}</Text>
              </View>
            </View>
          </View>

          {/* Comments Section */}
          <View style={s.commentsCard}>
            <Text style={s.commentsTitle}>
              댓글 <Text style={s.commentsCount}>{post.comment_count}</Text>
            </Text>

            {commentsQ.isLoading && (
              <ActivityIndicator color={c.brand.primary} style={{ marginVertical: 12 }} />
            )}

            {commentsQ.error && (
              <Text style={s.commentsError}>{commentsQ.error.message}</Text>
            )}

            {commentsQ.data && commentsQ.data.length === 0 && (
              <Text style={s.noCommentsText}>
                아직 댓글이 없어요. 첫 댓글을 남겨보세요!
              </Text>
            )}

            {(() => {
              const all = commentsQ.data ?? [];
              const topLevel = all.filter((c) => !c.parent_comment_id);
              const repliesByParent = new Map<string, CommentRow[]>();
              for (const c of all) {
                if (c.parent_comment_id) {
                  const list = repliesByParent.get(c.parent_comment_id) ?? [];
                  list.push(c);
                  repliesByParent.set(c.parent_comment_id, list);
                }
              }
              const confirmDelete = (c: CommentRow) =>
                customAlert('댓글을 삭제할까요?', '되돌릴 수 없어요.', [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () =>
                      deleteComment.mutate(
                        { commentId: c.id, postId: post.id },
                        {
                          onError: (e) =>
                            customAlert(
                              '삭제 실패',
                              e instanceof Error ? e.message : '알 수 없는 오류',
                            ),
                        },
                      ),
                  },
                ]);

              return topLevel.map((c) => (
                <View key={c.id}>
                  <CommentItem
                    comment={c}
                    isMine={c.author_id === meId}
                    isReply={false}
                    isEditing={editingId === c.id}
                    editingBody={editingBody}
                    onEditingBodyChange={setEditingBody}
                    onStartEdit={() => startEdit(c)}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    savingEdit={updateComment.isPending}
                    onReply={() => startReply(c)}
                    onDelete={() => confirmDelete(c)}
                  />
                  {(repliesByParent.get(c.id) ?? []).map((r) => (
                    <CommentItem
                      key={r.id}
                      comment={r}
                      isMine={r.author_id === meId}
                      isReply
                      isEditing={editingId === r.id}
                      editingBody={editingBody}
                      onEditingBodyChange={setEditingBody}
                      onStartEdit={() => startEdit(r)}
                      onSaveEdit={saveEdit}
                      onCancelEdit={cancelEdit}
                      savingEdit={updateComment.isPending}
                      onReply={() => startReply(r)}
                      onDelete={() => confirmDelete(r)}
                    />
                  ))}
                </View>
              ));
            })()}
          </View>
        </ScrollView>

        {/* Reply context banner */}
        {replyToId && (
          <View style={s.replyBanner}>
            <Feather name="corner-down-right" size={12} color={c.text.tertiary} />
            <Text style={s.replyBannerText} numberOfLines={1}>
              {replyToName ?? '댓글'}에게 답글 작성 중
            </Text>
            <Pressable onPress={cancelReply} hitSlop={6}>
              <Feather name="x" size={14} color={c.text.tertiary} />
            </Pressable>
          </View>
        )}

        {/* Comment Input Box */}
        <View style={[s.commentInputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            ref={commentInputRef}
            value={commentBody}
            onChangeText={(t) => setCommentBody(t.slice(0, COMMENT_MAX))}
            placeholder={replyToId ? '답글 입력...' : '따뜻한 댓글을 남겨보세요...'}
            placeholderTextColor={c.text.muted}
            maxLength={COMMENT_MAX}
            multiline
            style={s.textInput}
          />
          <Pressable
            onPress={handleSubmitComment}
            disabled={!commentBody.trim() || createComment.isPending}
            hitSlop={6}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <View
              style={[s.sendBtn, !commentBody.trim() && s.sendBtnDisabled]}
            >
              {createComment.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Feather
                  name="send"
                  size={18}
                  color={!commentBody.trim() ? '#94a3b8' : '#ffffff'}
                />
              )}
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PostHeader({ post }: { post: PostRow }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const authorName = post.author?.display_name ?? post.author?.username ?? '익명';
  const label = POST_TYPE_LABEL[post.post_type];
  const avatarBg = getAvatarBgColor(authorName);
  const avatarText = getAvatarTextColor(authorName);
  const avatarUrl = post.author?.avatar_url;
  const badge = BADGE_COLORS[post.post_type] || BADGE_COLORS.general;
  const authorId = post.author_id;
  const goToProfile = () => {
    if (authorId) router.push({
      pathname: '/u/[id]',
      params: { id: authorId, returnTo: `/community/${post.id}` },
    } as never);
  };

  return (
    <View style={s.postHeader}>
      <Pressable onPress={goToProfile} hitSlop={4}>
        {({ pressed }) => (
          <View style={[s.avatar, { backgroundColor: avatarBg, opacity: pressed ? 0.7 : 1 }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={s.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={[s.avatarTextVal, { color: avatarText }]}>
                {(authorName[0] ?? '?').toUpperCase()}
              </Text>
            )}
          </View>
        )}
      </Pressable>
      <Pressable onPress={goToProfile} hitSlop={4} style={s.authorInfo}>
        {({ pressed }) => (
          <View style={{ opacity: pressed ? 0.7 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={s.authorName}>{authorName}</Text>
              <FeaturedBadgeChip badgeKey={post.author?.featured_badge_key} size={11} />
            </View>
            <Text style={s.timestamp}>{formatRelativeTime(post.created_at)}</Text>
          </View>
        )}
      </Pressable>
      <View style={[s.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
        <Text style={[s.badgeText, { color: badge.text }]}>{label}</Text>
      </View>
    </View>
  );
}

function MeetupInfoCard({ post, isMine }: { post: PostRow; isMine: boolean }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const cap = post.meetup_capacity;
  const remaining = cap != null ? Math.max(0, cap - post.participant_count) : null;
  const full = cap != null && post.participant_count >= cap;
  const location = post.gym
    ? `${post.gym.name}${post.gym.branch ? ` ${post.gym.branch}` : ''}`
    : post.meetup_location;

  const isPast = post.meetup_at ? new Date(post.meetup_at).getTime() < Date.now() : false;

  let countdown: { label: string; tone: 'urgent' | 'past' | 'soon' | 'far' } | null = null;
  if (post.meetup_at) countdown = describeMeetupCountdown(post.meetup_at);

  const toneStyle: Record<string, { bg: string; fg: string }> = {
    urgent: { bg: '#fee2e2', fg: '#dc2626' },
    soon:   { bg: '#ffedd5', fg: '#c2410c' },
    far:    { bg: '#e0f2fe', fg: '#0369a1' },
    past:   { bg: '#f1f5f9', fg: '#64748b' },
  };

  const participantsQ = useMeetupParticipants(post.id);
  const myStatusQ = useMyMeetupStatus(post.id);
  const joinMeetup = useJoinMeetup();
  const cancelMeetupJoin = useCancelMeetupJoin();

  const myStatus = myStatusQ.data ?? null;
  const isJoined = myStatus === 'joined';
  const busy = joinMeetup.isPending || cancelMeetupJoin.isPending;

  function handleJoin() {
    if (busy) return;
    if (full || isPast) return;
    joinMeetup.mutate(post.id, {
      onError: (e) =>
        customAlert('참가 신청 실패', e instanceof Error ? e.message : '알 수 없는 오류'),
    });
  }

  function handleCancelJoin() {
    if (busy) return;
    customAlert('참가를 취소할까요?', '취소 후에는 다시 신청해야 해요.', [
      { text: '되돌아가기', style: 'cancel' },
      {
        text: '취소',
        style: 'destructive',
        onPress: () =>
          cancelMeetupJoin.mutate(post.id, {
            onError: (e) =>
              customAlert('취소 실패', e instanceof Error ? e.message : '알 수 없는 오류'),
          }),
      },
    ]);
  }

  return (
    <View style={s.meetupCard}>
      <View style={s.meetupCardHeaderRow}>
        <View style={s.meetupCardTitleRow}>
          <Feather name="calendar" size={14} color="#b45309" />
          <Text style={s.meetupCardTitle}>모임 정보</Text>
        </View>
        {countdown && (
          <View style={[s.meetupCardCountdown, { backgroundColor: toneStyle[countdown.tone].bg }]}>
            <Text style={[s.meetupCardCountdownText, { color: toneStyle[countdown.tone].fg }]}>
              {countdown.label}
            </Text>
          </View>
        )}
      </View>

      <View style={s.meetupCardRow}>
        <Feather name="clock" size={14} color="#92400e" />
        <Text style={s.meetupCardRowText}>
          {post.meetup_at ? formatMeetupAbsolute(post.meetup_at) : '날짜 미정'}
        </Text>
      </View>

      {location && (
        <View style={s.meetupCardRow}>
          <Feather name="map-pin" size={14} color="#92400e" />
          <Text style={s.meetupCardRowText}>{location}</Text>
        </View>
      )}

      <View style={s.meetupCardRow}>
        <Feather name="users" size={14} color="#92400e" />
        <Text style={s.meetupCardRowText}>
          {cap != null
            ? `${post.participant_count} / ${cap}명`
            : `정원 무제한 (현재 ${post.participant_count}명)`}
          {cap != null && remaining != null && remaining > 0 && !full && (
            <Text style={s.meetupCardRemainText}>  · 남은 자리 {remaining}</Text>
          )}
          {full && <Text style={s.meetupCardFullText}>  · 마감</Text>}
        </Text>
      </View>

      {/* CTA — 주최자 / 참가 / 취소 / 마감 / 종료 */}
      <View style={{ marginTop: 4 }}>
        {isMine ? (
          <View style={s.meetupHostPill}>
            <Feather name="star" size={12} color="#b45309" />
            <Text style={s.meetupHostPillText}>내가 주최한 모임</Text>
          </View>
        ) : isPast ? (
          <View style={[s.meetupJoinBtn, s.meetupJoinBtnDisabled]}>
            <Feather name="x" size={14} color={c.text.muted} />
            <Text style={s.meetupJoinBtnDisabledText}>종료된 모임</Text>
          </View>
        ) : isJoined ? (
          <Pressable
            onPress={handleCancelJoin}
            disabled={busy}
            style={({ pressed }) => [
              s.meetupJoinBtn,
              s.meetupJoinBtnSecondary,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#b45309" />
            ) : (
              <>
                <Feather name="check-circle" size={14} color="#b45309" />
                <Text style={s.meetupJoinBtnSecondaryText}>참가 중 · 취소하기</Text>
              </>
            )}
          </Pressable>
        ) : full ? (
          <View style={[s.meetupJoinBtn, s.meetupJoinBtnDisabled]}>
            <Feather name="users" size={14} color={c.text.muted} />
            <Text style={s.meetupJoinBtnDisabledText}>정원 마감</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleJoin}
            disabled={busy}
            style={({ pressed }) => [
              s.meetupJoinBtn,
              s.meetupJoinBtnPrimary,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Feather name="user-plus" size={14} color="#ffffff" />
                <Text style={s.meetupJoinBtnPrimaryText}>참가 신청</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* 참가자 목록 */}
      <View style={s.meetupParticipants}>
        <Text style={s.meetupParticipantsTitle}>
          참가자{' '}
          <Text style={s.meetupParticipantsCount}>
            {participantsQ.data?.length ?? post.participant_count}
          </Text>
        </Text>
        {participantsQ.isLoading ? (
          <ActivityIndicator size="small" color="#b45309" style={{ marginVertical: 4 }} />
        ) : participantsQ.data && participantsQ.data.length > 0 ? (
          <View style={s.meetupParticipantsList}>
            {participantsQ.data.map((p) => (
              <ParticipantChip key={p.user_id} participant={p} isHost={p.user_id === post.author_id} />
            ))}
          </View>
        ) : (
          <Text style={s.meetupParticipantsEmpty}>아직 참가자가 없어요</Text>
        )}
      </View>
    </View>
  );
}

function ParticipantChip({
  participant,
  isHost,
}: {
  participant: MeetupParticipant;
  isHost: boolean;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const name = participant.user?.display_name ?? participant.user?.username ?? '익명';
  const avatarBg = getAvatarBgColor(name);
  const avatarFg = getAvatarTextColor(name);
  const avatarUrl = participant.user?.avatar_url;
  return (
    <View style={s.participantChip}>
      <View style={[s.participantAvatar, { backgroundColor: avatarBg }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={s.participantAvatarImage} resizeMode="cover" />
        ) : (
          <Text style={[s.participantAvatarText, { color: avatarFg }]}>
            {(name[0] ?? '?').toUpperCase()}
          </Text>
        )}
      </View>
      <Text style={s.participantName} numberOfLines={1}>{name}</Text>
      {isHost && (
        <View style={s.participantHostDot}>
          <Feather name="star" size={9} color="#b45309" />
        </View>
      )}
    </View>
  );
}

function CommentItem({
  comment,
  isMine,
  isReply,
  isEditing,
  editingBody,
  onEditingBodyChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  savingEdit,
  onReply,
  onDelete,
}: {
  comment: CommentRow;
  isMine: boolean;
  isReply: boolean;
  isEditing: boolean;
  editingBody: string;
  onEditingBodyChange: (t: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  savingEdit: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const authorName = comment.author?.display_name ?? comment.author?.username ?? '익명';
  const avatarBg = getAvatarBgColor(authorName);
  const avatarText = getAvatarTextColor(authorName);
  const avatarUrl = comment.author?.avatar_url;
  const canSaveEdit = editingBody.trim().length > 0 && !savingEdit;
  const authorId = comment.author_id;
  const goToProfile = () => {
    if (authorId) router.push({
      pathname: '/u/[id]',
      params: { id: authorId, returnTo: `/community/${comment.post_id}` },
    } as never);
  };

  return (
    <View style={[s.commentItem, isReply && s.commentItemReply]}>
      <Pressable onPress={goToProfile} hitSlop={4}>
        {({ pressed }) => (
          <View style={[s.avatarSmall, { backgroundColor: avatarBg, opacity: pressed ? 0.7 : 1 }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={s.avatarSmallImage} resizeMode="cover" />
            ) : (
              <Text style={[s.avatarTextValSmall, { color: avatarText }]}>
                {(authorName[0] ?? '?').toUpperCase()}
              </Text>
            )}
          </View>
        )}
      </Pressable>
      <View style={s.commentContent}>
        <View style={s.commentHeader}>
          <Pressable onPress={goToProfile} hitSlop={4} style={s.commentAuthorInfo}>
            {({ pressed }) => (
              <View style={{ opacity: pressed ? 0.7 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={s.commentAuthor}>{authorName}</Text>
                  <FeaturedBadgeChip badgeKey={comment.author?.featured_badge_key} size={10} />
                </View>
                <Text style={s.commentTime}>{formatRelativeTime(comment.created_at)}</Text>
              </View>
            )}
          </Pressable>
          {!isEditing && (
            <View style={s.commentActions}>
              <Pressable
                onPress={onReply}
                hitSlop={4}
                style={({ pressed }) => [s.commentAction, { opacity: pressed ? 0.5 : 1 }]}
              >
                <Text style={s.commentActionText}>답글</Text>
              </Pressable>
              {isMine && (
                <>
                  <Pressable
                    onPress={onStartEdit}
                    hitSlop={4}
                    style={({ pressed }) => [s.commentAction, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <Text style={s.commentActionText}>수정</Text>
                  </Pressable>
                  <Pressable
                    onPress={onDelete}
                    hitSlop={4}
                    style={({ pressed }) => [s.commentAction, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <Text style={[s.commentActionText, { color: c.status.danger }]}>삭제</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>

        {isEditing ? (
          <>
            <TextInput
              value={editingBody}
              onChangeText={(t) => onEditingBodyChange(t.slice(0, COMMENT_MAX))}
              multiline
              autoFocus
              style={s.commentEditInput}
              maxLength={COMMENT_MAX}
            />
            <View style={s.commentEditActions}>
              <Pressable
                onPress={onCancelEdit}
                hitSlop={6}
                style={({ pressed }) => [s.commentEditBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={s.commentEditCancelText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={onSaveEdit}
                disabled={!canSaveEdit}
                hitSlop={6}
                style={({ pressed }) => [
                  s.commentEditBtn,
                  s.commentEditSaveBtn,
                  !canSaveEdit && s.commentEditSaveBtnDisabled,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={s.commentEditSaveText}>저장</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={s.commentBody}>{comment.body}</Text>
        )}
      </View>
    </View>
  );
}

function PostActionMenu({
  visible, isMine, deleting, onClose, onEdit, onDelete, onShare,
}: {
  visible: boolean;
  isMine: boolean;
  deleting: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const c = useThemeColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: c.bg.overlay, justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: c.bg.card,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 28,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 38, height: 4, borderRadius: 999,
              backgroundColor: c.border.strong, marginBottom: 10,
            }}
          />
          <ActionMenuItem
            icon="share-2"
            label="공유"
            color={c.text.primary}
            onPress={onShare}
          />
          {isMine && (
            <ActionMenuItem
              icon="edit-3"
              label="수정"
              color={c.text.primary}
              onPress={onEdit}
            />
          )}
          {isMine && (
            <ActionMenuItem
              icon="trash-2"
              label={deleting ? '삭제 중...' : '삭제'}
              color={c.status.danger}
              onPress={onDelete}
              disabled={deleting}
            />
          )}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [{
              marginTop: 6, paddingVertical: 14, borderRadius: 12,
              alignItems: 'center', backgroundColor: c.bg.subtle,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: c.text.secondary }}>취소</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionMenuItem({ icon, label, color, onPress, disabled }: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12,
        opacity: pressed ? 0.6 : disabled ? 0.4 : 1,
        backgroundColor: pressed ? c.bg.subtle : 'transparent',
      }]}
    >
      <Feather name={icon} size={18} color={color} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color }}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: c.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: c.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: c.status.danger,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: c.border.strong,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtnText: {
    color: c.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: c.bg.card,
    borderBottomWidth: 1,
    borderColor: c.border.subtle,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  postCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 18,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  gymPillRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  gymPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.bg.subtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gymPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.secondary,
    maxWidth: 240,
  },
  cardSeparator: {
    height: 1,
    backgroundColor: c.bg.subtle,
    marginTop: 16,
    marginBottom: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarTextVal: {
    fontWeight: '800',
    fontSize: 16,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text.primary,
  },
  timestamp: {
    fontSize: 12,
    color: c.text.muted,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: c.text.primary,
    lineHeight: 28,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  postBody: {
    fontSize: 16,
    color: c.text.secondary,
    lineHeight: 26,
  },
  imageGrid: {
    gap: 8,
    marginTop: 12,
  },
  imageWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border.subtle,
  },
  postImage: {
    width: '100%',
    height: 220,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 8,
  },
  metricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  metricText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text.tertiary,
  },
  metricTextLiked: {
    color: c.status.danger,
  },
  commentsCard: {
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 20,
    padding: 18,
    shadowColor: c.shadow.color,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  commentsCount: {
    color: c.text.secondary,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text.primary,
    marginBottom: 12,
  },
  noCommentsText: {
    fontSize: 14,
    color: c.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: 16,
  },
  commentsError: {
    color: c.status.danger,
    fontSize: 13,
    marginVertical: 8,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: c.border.subtle,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarSmallImage: { width: '100%', height: '100%' },
  avatarTextValSmall: {
    fontWeight: '800',
    fontSize: 12,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: c.text.primary,
  },
  commentTime: {
    fontSize: 11,
    color: c.text.muted,
  },
  commentBody: {
    fontSize: 14,
    color: c.text.secondary,
    lineHeight: 22,
  },
  commentItemReply: {
    marginLeft: 36,
    backgroundColor: c.bg.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginVertical: 4,
    borderBottomWidth: 0,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  commentAction: {
    paddingHorizontal: 2,
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.tertiary,
  },
  commentEditInput: {
    borderWidth: 1,
    borderColor: c.border.strong,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: c.text.primary,
    backgroundColor: c.bg.card,
    minHeight: 40,
    maxHeight: 120,
    marginTop: 4,
  },
  commentEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  commentEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  commentEditCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.tertiary,
  },
  commentEditSaveBtn: {
    backgroundColor: '#06b6d4',
  },
  commentEditSaveBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  commentEditSaveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: c.bg.subtle,
    borderTopWidth: 1,
    borderColor: c.border.subtle,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: c.text.secondary,
  },
  commentInputBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: c.border.subtle,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: c.bg.card,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: c.text.primary,
    maxHeight: 100,
    backgroundColor: c.bg.primary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    flexShrink: 0,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sendBtnDisabled: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Meetup info card
  meetupCard: {
    backgroundColor: c.status.warningBg,
    borderWidth: 1,
    borderColor: c.status.warning + '33', // 20% opacity
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  meetupCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meetupCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meetupCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.status.warning,
    letterSpacing: -0.2,
  },
  meetupCardCountdown: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  meetupCardCountdownText: {
    fontSize: 11,
    fontWeight: '800',
  },
  meetupCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meetupCardRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: c.text.primary,
  },
  meetupCardRemainText: {
    color: c.status.warning,
    fontWeight: '700',
  },
  meetupCardFullText: {
    color: c.text.tertiary,
    fontWeight: '800',
  },
  // CTA buttons
  meetupJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  meetupJoinBtnPrimary: {
    backgroundColor: '#d97706',
  },
  meetupJoinBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  meetupJoinBtnSecondary: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  meetupJoinBtnSecondaryText: {
    color: '#b45309',
    fontSize: 14,
    fontWeight: '800',
  },
  meetupJoinBtnDisabled: {
    backgroundColor: c.bg.subtle,
    borderWidth: 1,
    borderColor: c.border.subtle,
  },
  meetupJoinBtnDisabledText: {
    color: c.text.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  meetupHostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  meetupHostPillText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '800',
  },

  // 참가자 목록
  meetupParticipants: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#fde68a',
    gap: 8,
  },
  meetupParticipantsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b45309',
  },
  meetupParticipantsCount: {
    color: '#92400e',
  },
  meetupParticipantsEmpty: {
    fontSize: 11,
    fontWeight: '600',
    color: c.text.muted,
    fontStyle: 'italic',
  },
  meetupParticipantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 3,
    paddingRight: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: c.bg.card,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  participantAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  participantAvatarImage: {
    width: '100%',
    height: '100%',
  },
  participantAvatarText: {
    fontSize: 10,
    fontWeight: '800',
  },
  participantName: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.secondary,
    maxWidth: 80,
  },
  participantHostDot: {
    marginLeft: -2,
  },
  });
}