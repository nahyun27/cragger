import { customAlert } from '@/components/ui/custom-alert';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { checkBadgesAndNotify } from '@/lib/check-badges-and-notify';
import { supabase } from '@/lib/supabase';

export type PostType = 'general' | 'question' | 'review' | 'meetup';

export const POST_TYPE_LABEL: Record<PostType, string> = {
  general: '일반',
  question: '질문',
  review: '후기',
  meetup: '모임',
};

export type PostAuthor = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  featured_badge_key: string | null;
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
  crew_id: string | null;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  // 모임 전용 — non-meetup 글은 모두 null/0
  meetup_at: string | null;
  meetup_capacity: number | null;
  meetup_location: string | null;
  participant_count: number;
  author: PostAuthor | null;
  gym: PostGym | null;
};

const POST_SELECT_COLS =
  'id, author_id, post_type, title, body, gym_id, crew_id, image_urls, like_count, comment_count, created_at, meetup_at, meetup_capacity, meetup_location, participant_count, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, featured_badge_key), gym:gyms(id, name, branch)';

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
// 전체 커뮤니티 탭 — crew_id IS NULL (전체공개) 만.
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
        .select(POST_SELECT_COLS)
        .is('crew_id', null)
        .range(from, to);
      // 모임 필터일 때만 meetup_at 빠른 순. 그 외엔 최신순.
      if (postType === 'meetup') {
        q = q.order('meetup_at', { ascending: true, nullsFirst: false });
      } else {
        q = q.order('created_at', { ascending: false });
      }
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

// ── Crew Meetups ──────────────────────────────────────────────
// 한 크루의 모임 (post_type='meetup' + crew_id) — 다가오는·지난 분리.
// 단일 쿼리 + 클라이언트에서 분리.
export type CrewMeetups = {
  upcoming: PostRow[];   // meetup_at >= now, 가까운 순
  past: PostRow[];       // meetup_at <  now, 최근 종료 순
};

export function useCrewMeetups(crewId: string | undefined) {
  return useQuery({
    queryKey: ['community', 'crew-meetups', crewId] as const,
    enabled: !!crewId,
    queryFn: async (): Promise<CrewMeetups> => {
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT_COLS)
        .eq('crew_id', crewId!)
        .eq('post_type', 'meetup')
        .order('meetup_at', { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as PostRow[];
      const now = Date.now();
      const upcoming: PostRow[] = [];
      const past: PostRow[] = [];
      for (const p of rows) {
        if (p.meetup_at && new Date(p.meetup_at).getTime() < now) {
          past.push(p);
        } else {
          upcoming.push(p);
        }
      }
      // past 는 최근 종료가 위로
      past.sort((a, b) =>
        (b.meetup_at ?? '').localeCompare(a.meetup_at ?? ''),
      );
      return { upcoming, past };
    },
  });
}

// ── Crew Feed ─────────────────────────────────────────────────
// 특정 크루의 글만. RLS 가 비멤버 가로채니 caller 는 그냥 호출.
export function useCrewFeed(crewId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['community', 'crew-feed', crewId] as const,
    enabled: !!crewId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<PostRow[]> => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT_COLS)
        .eq('crew_id', crewId!)
        .order('created_at', { ascending: false })
        .range(from, to);
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
        .select(POST_SELECT_COLS)
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
      customAlert('좋아요 실패', err instanceof Error ? err.message : '알 수 없는 오류');
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'my-likes'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}

// ── My posts / comments ───────────────────────────────────────
export function useMyPosts() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['community', 'my-posts', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<PostRow[]> => {
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT_COLS)
        .eq('author_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PostRow[];
    },
  });
}

export type MyCommentRow = {
  id: string;
  post_id: string;
  body: string;
  created_at: string;
  parent_comment_id: string | null;
  post: {
    id: string;
    title: string | null;
    body: string;
    post_type: string;
  } | null;
};

export function useMyComments() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['community', 'my-comments', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<MyCommentRow[]> => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(
          'id, post_id, body, created_at, parent_comment_id, post:posts!post_comments_post_id_fkey(id, title, body, post_type)',
        )
        .eq('author_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as MyCommentRow[];
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
          'id, post_id, author_id, body, created_at, parent_comment_id, author:profiles!post_comments_author_id_fkey(id, username, display_name, avatar_url, featured_badge_key)',
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
      checkBadgesAndNotify();
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
  postType: PostType;
  title: string | null;
  body: string;
  gymId: string | null;
  imageUrls?: string[];
  // 크루 전용 — 값 있으면 그 크루 멤버만 조회 가능.
  crewId?: string | null;
  // 모임 전용 — postType==='meetup' 일 때만 의미.
  meetupAt?: string | null;          // ISO timestamptz
  meetupCapacity?: number | null;
  meetupLocation?: string | null;
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
      const isMeetup = args.postType === 'meetup';
      const { data, error } = await supabase
        .from('posts')
        .insert({
          author_id: userId,
          post_type: args.postType,
          title: args.title?.trim() ? args.title.trim() : null,
          body,
          gym_id: args.gymId,
          image_urls: args.imageUrls ?? [],
          crew_id: args.crewId ?? null,
          meetup_at: isMeetup ? (args.meetupAt ?? null) : null,
          meetup_capacity: isMeetup ? (args.meetupCapacity ?? null) : null,
          meetup_location: isMeetup ? (args.meetupLocation ?? null) : null,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'crew-feed'] });
      checkBadgesAndNotify();
    },
  });
}

export type UpdatePostArgs = {
  postId: string;
  postType: PostType;
  title: string | null;
  body: string;
  gymId: string | null;
  imageUrls: string[];
  meetupAt?: string | null;
  meetupCapacity?: number | null;
  meetupLocation?: string | null;
};

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: UpdatePostArgs) => {
      const body = args.body.trim();
      if (!body) throw new Error('본문을 입력하세요');
      const isMeetup = args.postType === 'meetup';
      const { error } = await supabase
        .from('posts')
        .update({
          post_type: args.postType,
          title: args.title?.trim() ? args.title.trim() : null,
          body,
          gym_id: args.gymId,
          image_urls: args.imageUrls,
          meetup_at: isMeetup ? (args.meetupAt ?? null) : null,
          meetup_capacity: isMeetup ? (args.meetupCapacity ?? null) : null,
          meetup_location: isMeetup ? (args.meetupLocation ?? null) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', args.postId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'post', vars.postId] });
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

// ── Meetup participants ────────────────────────────────────────
export type MeetupParticipantStatus = 'joined' | 'cancelled';

export type MeetupParticipant = {
  user_id: string;
  status: MeetupParticipantStatus;
  joined_at: string;
  user: PostAuthor | null;
};

// 한 모임의 참가자 — joined 상태만 노출, 신청 순.
export function useMeetupParticipants(postId: string | undefined) {
  return useQuery({
    queryKey: ['community', 'meetup-participants', postId] as const,
    enabled: !!postId,
    queryFn: async (): Promise<MeetupParticipant[]> => {
      const { data, error } = await supabase
        .from('meetup_participants')
        .select(
          'user_id, status, joined_at, user:profiles!meetup_participants_user_id_fkey(id, username, display_name, avatar_url, featured_badge_key)',
        )
        .eq('post_id', postId!)
        .eq('status', 'joined')
        .order('joined_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as MeetupParticipant[];
    },
  });
}

// 내 참가 상태 — null=신청 안 함, 'joined'=참가 중, 'cancelled'=취소함.
export function useMyMeetupStatus(postId: string | undefined) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['community', 'meetup-my-status', postId, userId] as const,
    enabled: !!postId && !!userId,
    queryFn: async (): Promise<MeetupParticipantStatus | null> => {
      const { data, error } = await supabase
        .from('meetup_participants')
        .select('status')
        .eq('post_id', postId!)
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.status as MeetupParticipantStatus | undefined) ?? null;
    },
  });
}

// 모임 참가 — 처음이면 INSERT, 이전에 취소했으면 status='joined' 로 UPSERT.
// 정원 마감 / 종료 체크는 caller(UI) 에서 미리 막음. race 가 발생해도
// 클라이언트는 트리거가 갱신한 participant_count 를 다음 fetch에서 받음.
export function useJoinMeetup() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (postId: string) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('meetup_participants')
        .upsert(
          { post_id: postId, user_id: userId, status: 'joined' },
          { onConflict: 'post_id,user_id' },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'post', postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'meetup-participants', postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'meetup-my-status', postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      checkBadgesAndNotify();
    },
  });
}

// 내가 참가(joined)한 모임 전체 — 홈 D-day 섹션 + 프로필 이력에서 사용.
export function useMyJoinedMeetups() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['community', 'my-joined-meetups', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<PostRow[]> => {
      const { data: pRows, error: pErr } = await supabase
        .from('meetup_participants')
        .select('post_id')
        .eq('user_id', userId!)
        .eq('status', 'joined');
      if (pErr) throw new Error(pErr.message);
      const postIds = ((pRows ?? []) as Array<{ post_id: string }>).map((r) => r.post_id);
      if (postIds.length === 0) return [];
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT_COLS)
        .in('id', postIds)
        .order('meetup_at', { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PostRow[];
    },
  });
}

// 참가 취소 — soft cancel (status='cancelled'). 트리거가 count 감소.
export function useCancelMeetupJoin() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (postId: string) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('meetup_participants')
        .update({ status: 'cancelled' })
        .eq('post_id', postId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'post', postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'meetup-participants', postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'meetup-my-status', postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}
