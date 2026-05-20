import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type PostType = 'general' | 'question' | 'review' | 'meetup';

export const POST_TYPE_LABEL: Record<Exclude<PostType, 'meetup'>, string> = {
  general: '일반',
  question: '질문',
  review: '후기',
};

export type PostAuthor = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type PostGym = {
  id: string;
  name: string;
  branch: string | null;
};

export type PostRow = {
  id: string;
  author_id: string;
  post_type: PostType;
  title: string | null;
  body: string;
  gym_id: string | null;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  author: PostAuthor | null;
  gym: PostGym | null;
};

const PAGE_SIZE = 20;

// Strip chars that would break PostgREST .or() syntax.
function sanitizeSearch(term: string): string {
  return term
    .trim()
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Feed (infinite, optional type filter + free-text search) ────
export function useCommunityFeed(
  postType: PostType | 'all',
  searchTerm = '',
) {
  const cleaned = sanitizeSearch(searchTerm);
  return useInfiniteQuery({
    queryKey: ['community', 'feed', postType, cleaned] as const,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<PostRow[]> => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from('posts')
        .select(
          'id, author_id, post_type, title, body, gym_id, image_urls, like_count, comment_count, created_at, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url), gym:gyms(id, name, branch)',
        )
        .order('created_at', { ascending: false })
        .range(from, to);
      if (postType !== 'all') q = q.eq('post_type', postType);
      if (cleaned) q = q.or(`title.ilike.*${cleaned}*,body.ilike.*${cleaned}*`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PostRow[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length,
  });
}

// ── Post detail ────────────────────────────────────────────────
export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ['community', 'post', postId] as const,
    enabled: !!postId,
    queryFn: async (): Promise<PostRow> => {
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, author_id, post_type, title, body, gym_id, image_urls, like_count, comment_count, created_at, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url), gym:gyms(id, name, branch)',
        )
        .eq('id', postId!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as PostRow;
    },
  });
}

// ── My likes (Set of post_ids I liked) ─────────────────────────
export function useMyLikes() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['community', 'my-likes', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId!);
      if (error) throw new Error(error.message);
      return new Set(
        ((data ?? []) as Array<{ post_id: string }>).map((r) => r.post_id),
      );
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async ({
      postId,
      currentlyLiked,
    }: {
      postId: string;
      currentlyLiked: boolean;
    }) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      if (currentlyLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ user_id: userId, post_id: postId });
        if (error) throw new Error(error.message);
      }
    },
    onMutate: async ({ postId, currentlyLiked }) => {
      const userId = authSession?.user.id;
      if (!userId) return;
      const likesKey = ['community', 'my-likes', userId];
      await queryClient.cancelQueries({ queryKey: likesKey });
      const prevLikes = queryClient.getQueryData<Set<string>>(likesKey);
      if (prevLikes) {
        const next = new Set(prevLikes);
        if (currentlyLiked) next.delete(postId);
        else next.add(postId);
        queryClient.setQueryData(likesKey, next);
      }
      return { prevLikes };
    },
    onError: (err, _vars, ctx) => {
      const userId = authSession?.user.id;
      if (userId && ctx?.prevLikes) {
        queryClient.setQueryData(
          ['community', 'my-likes', userId],
          ctx.prevLikes,
        );
      }
      Alert.alert('좋아요 실패', err instanceof Error ? err.message : '알 수 없는 오류');
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'my-likes'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}

// ── Comments ───────────────────────────────────────────────────
export type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  parent_comment_id: string | null;
  author: PostAuthor | null;
};

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['community', 'comments', postId] as const,
    enabled: !!postId,
    queryFn: async (): Promise<CommentRow[]> => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(
          'id, post_id, author_id, body, created_at, parent_comment_id, author:profiles!post_comments_author_id_fkey(id, username, display_name, avatar_url)',
        )
        .eq('post_id', postId!)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CommentRow[];
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async ({
      postId,
      body,
      parentCommentId,
    }: {
      postId: string;
      body: string;
      parentCommentId?: string | null;
    }) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const trimmed = body.trim();
      if (!trimmed) throw new Error('댓글 내용을 입력하세요');
      const { error } = await supabase.from('post_comments').insert({
        post_id: postId,
        author_id: userId,
        body: trimmed,
        parent_comment_id: parentCommentId ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'comments', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
      body,
    }: {
      commentId: string;
      body: string;
      postId: string;
    }) => {
      const trimmed = body.trim();
      if (!trimmed) throw new Error('댓글 내용을 입력하세요');
      const { error } = await supabase
        .from('post_comments')
        .update({ body: trimmed })
        .eq('id', commentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'comments', vars.postId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string; postId: string }) => {
      const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'comments', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}

// ── Create / Delete post ───────────────────────────────────────
export type CreatePostArgs = {
  postType: Exclude<PostType, 'meetup'>;
  title: string | null;
  body: string;
  gymId: string | null;
  imageUrls?: string[];
};

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (args: CreatePostArgs): Promise<{ id: string }> => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const body = args.body.trim();
      if (!body) throw new Error('본문을 입력하세요');
      const { data, error } = await supabase
        .from('posts')
        .insert({
          author_id: userId,
          post_type: args.postType,
          title: args.title?.trim() ? args.title.trim() : null,
          body,
          gym_id: args.gymId,
          image_urls: args.imageUrls ?? [],
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
    },
  });
}
