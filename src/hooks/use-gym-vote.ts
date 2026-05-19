import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { GRID_COLORS, type GridColor } from '@/components/climb/color-grid';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// 8개 표준 색깔 × 사용자의 현재 grade_votes (있으면)
export type VoteableColor = {
  color: GridColor;
  currentVote: string | null; // grade ('V0', 'V3+'…) — null이면 미투표
};

// 시도 여부 무관하게 8색 다 노출. grade_votes에 들어있는 사용자 행만 가져와서
// 8색에 매핑. 미투표 색깔은 currentVote=null.
export function useVoteableColors(gymId: string | undefined) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['gyms', gymId, 'voteable-colors', userId] as const,
    enabled: !!gymId && !!userId,
    queryFn: async (): Promise<VoteableColor[]> => {
      const { data, error } = await supabase
        .from('grade_votes')
        .select('color, grade')
        .eq('user_id', userId!)
        .eq('gym_id', gymId!);
      if (error) throw new Error(error.message);
      const voteMap = new Map<string, string>();
      for (const r of (data ?? []) as Array<{ color: string; grade: string }>) {
        voteMap.set(r.color, r.grade);
      }
      return GRID_COLORS.map((c) => ({
        color: c,
        currentVote: voteMap.get(c) ?? null,
      }));
    },
  });
}

// 암장 색깔별 평균 (vote count 포함) — view 그대로
export type GymColorAvg = {
  color: string;
  voteCount: number;
  avgVGradeLabel: string | null;
  avgVGrade: number | null;
};

export function useGymColorAvgs(gymId: string | undefined) {
  return useQuery({
    queryKey: ['gyms', gymId, 'color-grade-stats'] as const,
    enabled: !!gymId,
    queryFn: async (): Promise<GymColorAvg[]> => {
      const { data, error } = await supabase
        .from('gym_color_grade_stats')
        .select('color, vote_count, avg_v_grade, avg_v_grade_label')
        .eq('gym_id', gymId!);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{
        color: string;
        vote_count: number;
        avg_v_grade: number | null;
        avg_v_grade_label: string | null;
      }>).map((r) => ({
        color: r.color,
        voteCount: r.vote_count,
        avgVGradeLabel: r.avg_v_grade_label,
        avgVGrade: r.avg_v_grade,
      }));
    },
  });
}

// 투표 mutation: grade_votes에 (user_id, gym_id, color) UPSERT.
// 1 round trip. 시도 여부 무관.
export type SubmitVoteArgs = {
  gymId: string;
  color: string;
  grade: string;
};

export function useSubmitGradeVote() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();

  return useMutation({
    mutationFn: async ({ gymId, color, grade }: SubmitVoteArgs) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase.from('grade_votes').upsert(
        {
          user_id: userId,
          gym_id: gymId,
          color,
          grade,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,gym_id,color' },
      );
      if (error) throw new Error(error.message);
      return { gymId, color, grade };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gyms', variables.gymId] });
    },
  });
}
