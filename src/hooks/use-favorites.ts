import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// 사용자의 즐겨찾기 gym_id Set 반환. O(1) 조회용.
export function useFavoriteGymIds() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['gym-favorites', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('gym_favorites')
        .select('gym_id')
        .eq('user_id', userId!);
      if (error) throw new Error(error.message);
      return new Set(((data ?? []) as Array<{ gym_id: string }>).map((r) => r.gym_id));
    },
  });
}

// 토글 — 현재 상태에 따라 INSERT 또는 DELETE.
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async ({ gymId, currentlyFavorite }: { gymId: string; currentlyFavorite: boolean }) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      if (currentlyFavorite) {
        const { error } = await supabase
          .from('gym_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('gym_id', gymId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('gym_favorites')
          .insert({ user_id: userId, gym_id: gymId });
        if (error) throw new Error(error.message);
      }
    },
    // Optimistic: 즉시 toggle. 실패 시 rollback.
    onMutate: async ({ gymId, currentlyFavorite }) => {
      const userId = authSession?.user.id;
      if (!userId) return;
      const key = ['gym-favorites', userId];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Set<string>>(key);
      if (prev) {
        const next = new Set(prev);
        if (currentlyFavorite) next.delete(gymId);
        else next.add(gymId);
        queryClient.setQueryData(key, next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      const userId = authSession?.user.id;
      if (!userId || !ctx?.prev) return;
      queryClient.setQueryData(['gym-favorites', userId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gym-favorites'] });
    },
  });
}
