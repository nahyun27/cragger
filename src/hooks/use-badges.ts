import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { syncBadges, type BadgeSyncResult } from '@/lib/badge-checker';
import { supabase } from '@/lib/supabase';

export type UserBadgeRow = {
  badge_key: string;
  earned_at: string;
};

export function useUserBadges(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-badges', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<UserBadgeRow[]> => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_key, earned_at')
        .eq('user_id', userId!)
        .order('earned_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as UserBadgeRow[];
    },
  });
}

/**
 * 신규 뱃지 판정 + INSERT.
 *
 * 사용:
 *   const check = useBadgeCheck();
 *   check.mutate(undefined, {
 *     onSuccess: ({ newlyEarned }) => {
 *       if (newlyEarned.length > 0) showBadgeToast(newlyEarned);
 *     },
 *   });
 *
 * 호출 시점:
 *   - 마이페이지 진입
 *   - 세션 저장 / 글 작성 / 크루 가입 등 onSuccess
 */
export function useBadgeCheck() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async (): Promise<BadgeSyncResult> => {
      const userId = authSession?.user.id;
      if (!userId) return { newlyEarned: [] };
      return syncBadges(userId);
    },
    onSuccess: (result, _vars) => {
      if (result.newlyEarned.length > 0) {
        const userId = authSession?.user.id;
        queryClient.invalidateQueries({ queryKey: ['user-badges', userId] });
      }
    },
  });
}
