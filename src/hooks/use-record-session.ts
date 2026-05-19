import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

import type { GridColor } from '@/components/climb/color-grid';

// 색깔별 카운트. 적어도 하나의 색깔이 tries > 0 이어야 의미 있음.
// sends <= tries는 호출 측에서 보장.
export type ColorCount = {
  color: GridColor;
  tries: number;
  sends: number;
};

export type RecordSessionArgs = {
  gymId: string;
  sessionDate: string; // 'YYYY-MM-DD'
  durationMin: number | null;
  condition: number | null; // 1..5 or null
  notes: string | null;
  colors: ColorCount[]; // tries === 0 인 항목은 호출 측에서 걸러서 들어옴
};

// 사후 기록 폼의 "기록" 버튼 mutation. 모두 batch INSERT:
//   1. sessions 1 row
//   2. problems N rows (사용된 색깔당 1개)
//   3. attempts (sends × send + (tries - sends) × project) rows
// 트랜잭션 묶지 않음 — 두 번째 INSERT 실패 시 orphan session/problems 가능
// (MVP 무시). 호출 측은 success/fail만 본다.
export function useRecordSession() {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();

  return useMutation({
    mutationFn: async (args: RecordSessionArgs) => {
      const userId = authSession?.user.id;
      if (!userId) throw new Error('Not authenticated');

      const usedColors = args.colors.filter((c) => c.tries > 0);
      if (usedColors.length === 0) {
        throw new Error('최소 한 색깔의 시도 수를 1 이상으로 입력하세요');
      }

      // 1) sessions
      const { data: sessionRow, error: sessionErr } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          gym_id: args.gymId,
          session_date: args.sessionDate,
          duration_min: args.durationMin,
          notes: args.notes,
          condition: args.condition,
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (sessionErr) throw new Error(sessionErr.message);
      const sessionId = (sessionRow as { id: string }).id;

      // 2) problems (1 per color)
      const { data: problemRows, error: problemErr } = await supabase
        .from('problems')
        .insert(
          usedColors.map((c) => ({
            gym_id: args.gymId,
            color: c.color,
            created_by: userId,
          })),
        )
        .select('id, color');
      if (problemErr) throw new Error(problemErr.message);

      const colorToProblemId = new Map<string, string>();
      for (const p of (problemRows ?? []) as Array<{ id: string; color: string }>) {
        colorToProblemId.set(p.color, p.id);
      }

      // 3) attempts
      const attemptRows: Array<{
        session_id: string;
        problem_id: string;
        climbing_type: 'boulder';
        result: 'send' | 'project';
      }> = [];
      for (const c of usedColors) {
        const problemId = colorToProblemId.get(c.color);
        if (!problemId) continue;
        for (let i = 0; i < c.sends; i++) {
          attemptRows.push({
            session_id: sessionId,
            problem_id: problemId,
            climbing_type: 'boulder',
            result: 'send',
          });
        }
        const projects = Math.max(0, c.tries - c.sends);
        for (let i = 0; i < projects; i++) {
          attemptRows.push({
            session_id: sessionId,
            problem_id: problemId,
            climbing_type: 'boulder',
            result: 'project',
          });
        }
      }

      if (attemptRows.length > 0) {
        const { error: attemptErr } = await supabase.from('attempts').insert(attemptRows);
        if (attemptErr) throw new Error(attemptErr.message);
      }

      return { sessionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
