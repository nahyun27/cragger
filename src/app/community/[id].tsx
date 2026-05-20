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
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top', 'bottom']}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (postQ.error || !postQ.data) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center p-6"
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4">
          {postQ.error?.message ?? '글을 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="border border-border-default rounded-md px-4 py-2"
        >
          <Text className="text-text-primary">돌아가기</Text>
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
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-text-primary text-base font-bold">글</Text>
        {isMine ? (
          <Pressable
            onPress={handleDeletePost}
            disabled={deletePost.isPending}
            className="p-2 active:opacity-60"
            hitSlop={8}
          >
            {deletePost.isPending ? (
              <ActivityIndicator size="small" />
            ) : (
              <Feather name="trash-2" size={20} color="#ef4444" />
            )}
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1" contentContainerClassName="p-5 gap-5">
          <PostHeader post={post} />

          {post.title && (
            <Text className="text-text-primary text-xl font-extrabold tracking-tight">
              {post.title}
            </Text>
          )}

          <Text className="text-text-primary text-base leading-7">{post.body}</Text>

          {post.image_urls.length > 0 && (
            <View className="gap-2">
              {post.image_urls.map((url, i) => (
                <Image
                  key={`${url}-${i}`}
                  source={{ uri: url }}
                  className="w-full h-64 rounded-xl"
                  resizeMode="cover"
                />
              ))}
            </View>
          )}

          {post.gym && (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/gym/[id]', params: { id: post.gym!.id } })
              }
              className="flex-row items-center gap-2 px-3 py-2 rounded-xl bg-background-secondary border border-border-subtle active:opacity-80"
            >
              <Feather name="map-pin" size={14} color="#0d9488" />
              <Text className="text-text-primary text-sm font-semibold flex-1">
                {post.gym.name}
                {post.gym.branch ? ` ${post.gym.branch}` : ''}
              </Text>
              <Feather name="chevron-right" size={16} color="#a1a1aa" />
            </Pressable>
          )}

          <View className="flex-row items-center gap-4 pt-2 border-t border-border-subtle">
            <Pressable
              onPress={() => {
                if (toggleLike.isPending) return;
                toggleLike.mutate({ postId: post.id, currentlyLiked: liked });
              }}
              className="flex-row items-center gap-1.5 py-2 active:opacity-60"
              hitSlop={8}
            >
              <Feather name="heart" size={18} color={liked ? '#ef4444' : '#71717a'} />
              <Text
                className={`text-sm font-semibold ${
                  liked ? 'text-status-danger' : 'text-text-tertiary'
                }`}
              >
                {post.like_count}
              </Text>
            </Pressable>
            <View className="flex-row items-center gap-1.5 py-2">
              <Feather name="message-circle" size={18} color="#71717a" />
              <Text className="text-text-tertiary text-sm font-semibold">
                {post.comment_count}
              </Text>
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-text-primary text-base font-bold">
              댓글 {post.comment_count}
            </Text>
            {commentsQ.isLoading && <ActivityIndicator color="#0d9488" />}
            {commentsQ.error && (
              <Text className="text-status-danger text-sm">{commentsQ.error.message}</Text>
            )}
            {commentsQ.data && commentsQ.data.length === 0 && (
              <Text className="text-text-tertiary text-sm">
                첫 댓글을 남겨보세요
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

        <View className="px-4 py-2 border-t border-border-subtle flex-row items-end gap-2">
          <TextInput
            value={commentBody}
            onChangeText={(t) => setCommentBody(t.slice(0, COMMENT_MAX))}
            placeholder="댓글 입력"
            placeholderTextColor="#9CA3AF"
            maxLength={COMMENT_MAX}
            multiline
            className="flex-1 border border-border-default rounded-2xl px-3 py-2 text-text-primary text-sm max-h-24"
          />
          <Pressable
            onPress={handleSubmitComment}
            disabled={!commentBody.trim() || createComment.isPending}
            className={`px-4 py-2.5 rounded-2xl items-center justify-center ${
              !commentBody.trim() ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {createComment.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                className={`text-sm font-semibold ${
                  !commentBody.trim() ? 'text-text-muted' : 'text-background-primary'
                }`}
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
  const typeLabel =
    post.post_type === 'meetup'
      ? '모임'
      : POST_TYPE_LABEL[post.post_type as Exclude<PostType, 'meetup'>];
  return (
    <View className="flex-row items-center gap-2">
      <View className="w-9 h-9 rounded-full bg-brand-primary/10 border border-brand-primary/30 items-center justify-center">
        <Text className="text-brand-primary text-sm font-bold">
          {(authorName[0] ?? '?').toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-text-primary text-sm font-bold">{authorName}</Text>
        <Text className="text-text-tertiary text-xs">
          {formatRelativeTime(post.created_at)}
        </Text>
      </View>
      <View className="px-2 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">
        <Text className="text-brand-primary text-[10px] font-bold">{typeLabel}</Text>
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
  return (
    <View className="flex-row gap-2.5 py-2 border-b border-border-subtle/60">
      <View className="w-7 h-7 rounded-full bg-brand-primary/10 border border-brand-primary/20 items-center justify-center">
        <Text className="text-brand-primary text-xs font-bold">
          {(authorName[0] ?? '?').toUpperCase()}
        </Text>
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-text-primary text-xs font-bold">{authorName}</Text>
            <Text className="text-text-tertiary text-[10px]">
              {formatRelativeTime(comment.created_at)}
            </Text>
          </View>
          {isMine && (
            <Pressable onPress={onDelete} hitSlop={8} className="active:opacity-60">
              <Feather name="x" size={14} color="#a1a1aa" />
            </Pressable>
          )}
        </View>
        <Text className="text-text-primary text-sm leading-5">{comment.body}</Text>
      </View>
    </View>
  );
}
