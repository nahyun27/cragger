import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// 사용자가 이 암장에서 시도한 색깔 목록 + 현재 투표 상태
export type VoteableColor = {
  color: string;
  attemptCount: number; // 그 (gym, color)에 사용자의 attempts 수
  currentVote: string | null; // felt_grade ('V0', 'V3+' 등) — null이면 아직 투표 안 함
};

export function useVoteableColors(gymId: string | undefined) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['gyms', gymId, 'voteable-colors', userId] as const,
    enabled: !!gymId && !!userId,
    queryFn: async (): Promise<VoteableColor[]> => {
      // !inner로 inner join하면 session.user_id / problem.gym_id 필터링 가능.
      const { data, error } = await supabase
        .from('attempts')
        .select(
          'id, felt_grade, created_at, session:sessions!inner(user_id), problem:problems!inner(gym_id, color)',
        )
        .eq('session.user_id', userId!)
        .eq('problem.gym_id', gymId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      type Row = {
        id: string;
        felt_grade: string | null;
        created_at: string;
        problem: { color: string } | null;
      };
      const rows = (data ?? []) as unknown as Row[];

      const map = new Map<string, VoteableColor>();
      for (const r of rows) {
        const color = r.problem?.color;
        if (!color) continue;
        const cur = map.get(color);
        if (cur) {
          cur.attemptCount += 1;
          // 첫 (가장 최근) 비-null felt_grade가 currentVote
          if (cur.currentVote == null && r.felt_grade) {
            cur.currentVote = r.felt_grade;
          }
        } else {
          map.set(color, {
            color,
            attemptCount: 1,
            currentVote: r.felt_grade ?? null,
          });
        }
      }
      return Array.from(map.values());
    },
  });
}

// 암장 색깔별 평균 (vote count 포함). UI에서 모달에 표시.
export type GymColorAvg = {
  color: string;
  voteCount: number;
  avgVGradeLabel: string | null; // 'V3+', 'V4' 등
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

// 투표 mutation: 사용자 × (gym, color) 에 felt_grade 정확히 1개 row만 남도록
//   1. 사용자의 이 (gym, color) attempts 모두 SELECT (created_at desc)
//   2. 첫 row 제외 나머지의 felt_grade → NULL (이전 흔적 청소)
//   3. 첫 row의 felt_grade → $grade
// 3 round trip. view는 row 단위 count + avg라 이 불변식이 정확성 보장.
export type SubmitVoteArgs = {
  gymId: string;
  color: string;
  grade: string; // 'V0' .. 'V8+'
};

export function useSubmitGradeVote() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();

  return useMutation({
    mutationFn: async ({ gymId, color, grade }: SubmitVoteArgs) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');

      // 1) 사용자 이 (gym, color) attempts 모두
      const { data: rows, error: selectErr } = await supabase
        .from('attempts')
        .select(
          'id, created_at, session:sessions!inner(user_id), problem:problems!inner(gym_id, color)',
        )
        .eq('session.user_id', userId)
        .eq('problem.gym_id', gymId)
        .eq('problem.color', color)
        .order('created_at', { ascending: false });
      if (selectErr) throw new Error(selectErr.message);
      const attempts = ((rows ?? []) as Array<{ id: string }>);
      if (attempts.length === 0) {
        throw new Error('이 색깔에 시도 기록이 없어요');
      }

      const latestId = attempts[0].id;
      const otherIds = attempts.slice(1).map((a) => a.id);

      // 2) 나머지 felt_grade → null
      if (otherIds.length > 0) {
        const { error: clearErr } = await supabase
          .from('attempts')
          .update({ felt_grade: null })
          .in('id', otherIds);
        if (clearErr) throw new Error(clearErr.message);
      }

      // 3) 최신 row → grade
      const { error: setErr } = await supabase
        .from('attempts')
        .update({ felt_grade: grade })
        .eq('id', latestId);
      if (setErr) throw new Error(setErr.message);

      return { gymId, color, grade };
    },
    onSuccess: (_data, variables) => {
      // 투표 진입 화면, 암장 상세 (color stats), 글로벌 stats 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['gyms', variables.gymId] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });
}
