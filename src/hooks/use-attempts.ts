import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { SessionRow } from '@/hooks/use-session';

export type ClimbingType = 'boulder' | 'lead' | 'board';
export type AttemptResult = 'onsight' | 'flash' | 'send' | 'project' | 'fall';

export type Attempt = {
  id: string;
  session_id: string;
  problem_id: string | null;
  climbing_type: ClimbingType;
  result: AttemptResult;
  tries: number;
  felt_grade: string | null;
  notes: string | null;
  created_at: string;
  problem: { id: string; color: string } | null;
};

export function useAttempts(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'attempts'] as const,
    enabled: !!sessionId,
    queryFn: async (): Promise<Attempt[]> => {
      const { data, error } = await supabase
        .from('attempts')
        .select(
          'id, session_id, problem_id, climbing_type, result, tries, felt_grade, notes, created_at, problem:problems(id, color)',
        )
        .eq('session_id', sessionId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Attempt[];
    },
  });
}

export type AddAttemptArgs = {
  session: Pick<SessionRow, 'id' | 'gym_id'>;
  color: string;
  result: AttemptResult;
  tries?: number;
};

// 단계 2b: 매 탭마다 fresh problems row + attempts row. problem 재사용/캐싱은 별도.
// 트랜잭션 묶지 않음 — 두 번째 INSERT 실패 시 orphan problem 발생 가능 (MVP 무시).
export function useAddAttempt() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  return useMutation({
    mutationFn: async ({ session, color, result, tries }: AddAttemptArgs) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');
      if (!session.gym_id) throw new Error('이 세션에는 암장이 연결되어 있지 않아요');

      const { data: problem, error: problemError } = await supabase
        .from('problems')
        .insert({
          gym_id: session.gym_id,
          color,
          created_by: userId,
        })
        .select('id')
        .single();
      if (problemError) throw new Error(problemError.message);

      const { data: attempt, error: attemptError } = await supabase
        .from('attempts')
        .insert({
          session_id: session.id,
          climbing_type: 'boulder' satisfies ClimbingType,
          problem_id: problem.id,
          result,
          tries: Math.max(tries ?? 1, 1),
        })
        .select('id')
        .single();
      if (attemptError) throw new Error(attemptError.message);
      return attempt as { id: string };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sessions', variables.session.id, 'attempts'],
      });
    },
  });
}
