import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type FollowUserMini = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type FollowCounts = {
  followers: number;
  following: number;
};

// ── 팔로워/팔로잉 카운트 ─────────────────────────────────────
export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ['follows', 'counts', userId] as const,
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<FollowCounts> => {
      const [followersR, followingR] = await Promise.all([
        supabase
          .from('follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('followee_id', userId!),
        supabase
          .from('follows')
          .select('followee_id', { count: 'exact', head: true })
          .eq('follower_id', userId!),
      ]);
      if (followersR.error) throw new Error(followersR.error.message);
      if (followingR.error) throw new Error(followingR.error.message);
      return {
        followers: followersR.count ?? 0,
        following: followingR.count ?? 0,
      };
    },
  });
}

// ── 내가 targetId 를 팔로우하는지 ────────────────────────────
export function useIsFollowing(targetUserId: string | undefined) {
  const { session: authSession } = useAuth();
  const meId = authSession?.user.id;
  return useQuery({
    queryKey: ['follows', 'is-following', meId, targetUserId] as const,
    enabled: !!meId && !!targetUserId && meId !== targetUserId,
    staleTime: 30_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', meId!)
        .eq('followee_id', targetUserId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return !!data;
    },
  });
}

// ── 팔로우 / 언팔로우 ───────────────────────────────────────
export function useFollow() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      if (userId === targetUserId) throw new Error('자기 자신은 팔로우할 수 없어요');
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: userId, followee_id: targetUserId });
      if (error) {
        if (error.code === '23505') return; // 이미 팔로우 — no-op
        throw new Error(error.message);
      }
    },
    onSuccess: (_d, targetUserId) => {
      const meId = authSession?.user.id;
      queryClient.invalidateQueries({ queryKey: ['follows', 'is-following', meId, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['follows', 'counts', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['follows', 'counts', meId] });
      queryClient.invalidateQueries({ queryKey: ['follows', 'list'] });
    },
  });
}

export function useUnfollow() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('followee_id', targetUserId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, targetUserId) => {
      const meId = authSession?.user.id;
      queryClient.invalidateQueries({ queryKey: ['follows', 'is-following', meId, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['follows', 'counts', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['follows', 'counts', meId] });
      queryClient.invalidateQueries({ queryKey: ['follows', 'list'] });
    },
  });
}

// ── 리스트: 팔로워들 (이 사람을 팔로우하는 사람들) ───────────
export function useFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: ['follows', 'list', 'followers', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<FollowUserMini[]> => {
      const { data, error } = await supabase
        .from('follows')
        .select('follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url), created_at')
        .eq('followee_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ follower: FollowUserMini | null }>)
        .map((r) => r.follower)
        .filter((u): u is FollowUserMini => u !== null);
    },
  });
}

// ── 리스트: 팔로잉들 (이 사람이 팔로우하는 사람들) ────────────
export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: ['follows', 'list', 'following', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<FollowUserMini[]> => {
      const { data, error } = await supabase
        .from('follows')
        .select('followee:profiles!follows_followee_id_fkey(id, username, display_name, avatar_url), created_at')
        .eq('follower_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ followee: FollowUserMini | null }>)
        .map((r) => r.followee)
        .filter((u): u is FollowUserMini => u !== null);
    },
  });
}

// ── 사람 검색 ───────────────────────────────────────────────
export type SearchUser = FollowUserMini & {
  is_private: boolean;
};

export function useSearchUsers(query: string, limit = 30) {
  const q = query.trim().toLowerCase();
  return useQuery({
    queryKey: ['users', 'search', q] as const,
    enabled: q.length >= 1,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchUser[]> => {
      // username ILIKE OR display_name ILIKE — Supabase or() 사용
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_private')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as SearchUser[];
    },
  });
}
