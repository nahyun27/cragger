import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
  useComments,
  useCreateComment,
  useDeleteComment,
  useDeletePost,
  useMyLikes,
  usePost,
  useToggleLike,
  type CommentRow,
  type PostRow,
  type PostType,
} from '@/hooks/use-community';
import { useAuth } from '@/lib/auth-context';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

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
  general: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  question: { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' },
  review: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  meetup: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;

  const postQ = usePost(id);
  const commentsQ = useComments(id);
  const { data: likedSet } = useMyLikes();
  const toggleLike = useToggleLike();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const deletePost = useDeletePost();

  const [commentBody, setCommentBody] = useState('');

  if (postQ.isLoading) {
    return (
      <SafeAreaView style={s.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#0d9488" />
      </SafeAreaView>
    );
  }

  if (postQ.error || !postQ.data) {
    return (
      <SafeAreaView style={s.errorContainer} edges={['top', 'bottom']}>
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
    Alert.alert('이 글을 삭제할까요?', '댓글과 좋아요도 함께 사라져요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost.mutateAsync(id);
            router.replace('/(tabs)/community');
          } catch (e) {
            Alert.alert('삭제 실패', e instanceof Error ? e.message : '알 수 없는 오류');
          }
        },
      },
    ]);
  }

  async function handleSubmitComment() {
    if (!id || !commentBody.trim() || createComment.isPending) return;
    try {
      await createComment.mutateAsync({ postId: id, body: commentBody });
      setCommentBody('');
    } catch (e) {
      Alert.alert('댓글 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Detail Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [s.headerAction, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text style={s.headerTitle}>상세 보기</Text>
        {isMine ? (
          <Pressable
            onPress={handleDeletePost}
            disabled={deletePost.isPending}
            style={({ pressed }) => [s.headerAction, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            {deletePost.isPending ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Feather name="trash-2" size={20} color="#ef4444" />
            )}
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent}>
          {/* Post Header */}
          <PostHeader post={post} />

          {/* Post Title */}
          {post.title && (
            <Text style={s.postTitle}>
              {post.title}
            </Text>
          )}

          {/* Post Body */}
          <Text style={s.postBody}>{post.body}</Text>

          {/* Post Images */}
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

          {/* Tagged Gym */}
          {post.gym && (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/gym/[id]', params: { id: post.gym!.id } })
              }
              style={({ pressed }) => [s.gymCard, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="map-pin" size={14} color="#0d9488" />
              <Text style={s.gymCardText} numberOfLines={1}>
                {post.gym.name}
                {post.gym.branch ? ` ${post.gym.branch}` : ''}
              </Text>
              <Feather name="chevron-right" size={16} color="#a1a1aa" />
            </Pressable>
          )}

          {/* Like / Comment Counts */}
          <View style={s.postDivider} />
          <View style={s.metricsRow}>
            <Pressable
              onPress={() => {
                if (toggleLike.isPending) return;
                toggleLike.mutate({ postId: post.id, currentlyLiked: liked });
              }}
              style={({ pressed }) => [s.metricBtn, { opacity: pressed ? 0.6 : 1 }]}
              hitSlop={8}
            >
              <View style={[s.metricIconWrapper, liked && s.metricIconWrapperLiked]}>
                <Feather name="heart" size={16} color={liked ? '#ef4444' : '#71717a'} />
              </View>
              <Text
                style={[s.metricText, liked && s.metricTextLiked]}
                numberOfLines={1}
              >{post.like_count}</Text>
            </Pressable>
            <View style={s.metricBtn}>
              <View style={s.metricIconWrapper}>
                <Feather name="message-circle" size={16} color="#71717a" />
              </View>
              <Text style={s.metricText} numberOfLines={1}>{post.comment_count}</Text>
            </View>
          </View>
          <View style={s.postDivider} />

          {/* Comments Section */}
          <View style={s.commentsSection}>
            <Text style={s.commentsTitle}>댓글 목록</Text>
            
            {commentsQ.isLoading && <ActivityIndicator color="#0d9488" style={{ marginVertical: 12 }} />}
            
            {commentsQ.error && (
              <Text style={s.commentsError}>{commentsQ.error.message}</Text>
            )}
            
            {commentsQ.data && commentsQ.data.length === 0 && (
              <Text style={s.noCommentsText}>
                아직 작성된 댓글이 없습니다. 첫 댓글을 남겨보세요!
              </Text>
            )}
            
            {commentsQ.data?.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                isMine={c.author_id === meId}
                onDelete={() =>
                  deleteComment.mutate(
                    { commentId: c.id, postId: post.id },
                    {
                      onError: (e) =>
                        Alert.alert(
                          '삭제 실패',
                          e instanceof Error ? e.message : '알 수 없는 오류',
                        ),
                    },
                  )
                }
              />
            ))}
          </View>
        </ScrollView>

        {/* Comment Input Box */}
        <View style={s.commentInputBar}>
          <TextInput
            value={commentBody}
            onChangeText={(t) => setCommentBody(t.slice(0, COMMENT_MAX))}
            placeholder="따뜻한 댓글을 남겨보세요..."
            placeholderTextColor="#94a3b8"
            maxLength={COMMENT_MAX}
            multiline
            style={s.textInput}
          />
          <Pressable
            onPress={handleSubmitComment}
            disabled={!commentBody.trim() || createComment.isPending}
            style={({ pressed }) => [
              s.submitBtn,
              !commentBody.trim() ? s.submitBtnDisabled : s.submitBtnEnabled,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            {createComment.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text
                style={[
                  s.submitBtnText,
                  !commentBody.trim() ? s.submitBtnTextDisabled : s.submitBtnTextEnabled,
                ]}
              >
                등록
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PostHeader({ post }: { post: PostRow }) {
  const authorName = post.author?.display_name ?? post.author?.username ?? '익명';
  const label = post.post_type === 'meetup' ? '모임' : POST_TYPE_LABEL[post.post_type as Exclude<PostType, 'meetup'>];
  const avatarBg = getAvatarBgColor(authorName);
  const avatarText = getAvatarTextColor(authorName);
  const badge = BADGE_COLORS[post.post_type] || BADGE_COLORS.general;

  return (
    <View style={s.postHeader}>
      <View style={[s.avatar, { backgroundColor: avatarBg }]}>
        <Text style={[s.avatarTextVal, { color: avatarText }]}>
          {(authorName[0] ?? '?').toUpperCase()}
        </Text>
      </View>
      <View style={s.authorInfo}>
        <Text style={s.authorName}>{authorName}</Text>
        <Text style={s.timestamp}>{formatRelativeTime(post.created_at)}</Text>
      </View>
      <View style={[s.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
        <Text style={[s.badgeText, { color: badge.text }]}>{label}</Text>
      </View>
    </View>
  );
}

function CommentItem({
  comment,
  isMine,
  onDelete,
}: {
  comment: CommentRow;
  isMine: boolean;
  onDelete: () => void;
}) {
  const authorName = comment.author?.display_name ?? comment.author?.username ?? '익명';
  const avatarBg = getAvatarBgColor(authorName);
  const avatarText = getAvatarTextColor(authorName);

  return (
    <View style={s.commentItem}>
      <View style={[s.avatarSmall, { backgroundColor: avatarBg }]}>
        <Text style={[s.avatarTextValSmall, { color: avatarText }]}>
          {(authorName[0] ?? '?').toUpperCase()}
        </Text>
      </View>
      <View style={s.commentContent}>
        <View style={s.commentHeader}>
          <View style={s.commentAuthorInfo}>
            <Text style={s.commentAuthor}>{authorName}</Text>
            <Text style={s.commentTime}>{formatRelativeTime(comment.created_at)}</Text>
          </View>
          {isMine && (
            <Pressable onPress={onDelete} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Feather name="x" size={14} color="#94a3b8" />
            </Pressable>
          )}
        </View>
        <Text style={s.commentBody}>{comment.body}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  },
  avatarTextVal: {
    fontWeight: '800',
    fontSize: 15,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  timestamp: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 28,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  postBody: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 16,
  },
  imageGrid: {
    gap: 10,
    marginBottom: 16,
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  postImage: {
    width: '100%',
    height: 240,
  },
  gymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  gymCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  postDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  metricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  metricIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconWrapperLiked: {
    backgroundColor: '#ffe4e6',
  },
  metricText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  metricTextLiked: {
    color: '#ef4444',
  },
  commentsSection: {
    marginTop: 20,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  noCommentsText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: 16,
  },
  commentsError: {
    color: '#ef4444',
    fontSize: 13,
    marginVertical: 8,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextValSmall: {
    fontWeight: '800',
    fontSize: 11,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  commentTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  commentBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  commentInputBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: '#ffffff',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
    backgroundColor: '#f8fafc',
  },
  submitBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnEnabled: {
    backgroundColor: '#0d9488',
  },
  submitBtnDisabled: {
    backgroundColor: '#f1f5f9',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtnTextEnabled: {
    color: '#ffffff',
  },
  submitBtnTextDisabled: {
    color: '#cbd5e1',
  },
});
