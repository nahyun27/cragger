/**
 * 대결 인라인 기록 — 내 이름 카드에서 색깔만 탭으로 send 기록.
 *
 * 동작:
 *   - battle 의 (gym, date) 로 내 session 1개를 찾거나 만든다
 *   - 색깔 탭 → 같은 gym+color 의 problem 을 찾거나 만든다 → attempt INSERT (result='send', climbing_type='boulder')
 *   - 길게 누름 (removeSend) → 마지막 send 1개 DELETE
 *
 * 점수는 useBattleRanking 의 polling 또는 invalidate 로 자동 갱신.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type ColorCountMap = Record<string, number>;

export function useBattleRecording(args: {
  battleId: string | undefined;
  gymId: string | undefined;
  battleDate: string | undefined;        // YYYY-MM-DD
}) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  const queryClient = useQueryClient();
  const key = ['battle', 'recording', args.battleId, userId] as const;

  // 내 (이 대결의) 색깔별 send 카운트 — 같은 (gym, date) 의 모든 session 합산
  const counts = useQuery({
    queryKey: key,
    enabled: !!args.battleId && !!args.gymId && !!args.battleDate && !!userId,
    queryFn: async (): Promise<ColorCountMap> => {
      // 1) 매칭되는 모든 session id (이전에 /session/new 로 같은 날 만든 세션도 포함)
      const { data: sessionRows, error: sErr } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId!)
        .eq('gym_id', args.gymId!)
        .eq('session_date', args.battleDate!);
      if (sErr) throw new Error(sErr.message);
      const sids = ((sessionRows ?? []) as Array<{ id: string }>).map((r) => r.id);
      if (sids.length === 0) return {};
      const { data: aRows, error: aErr } = await supabase
        .from('attempts')
        .select('result, problem:problems(color)')
        .in('session_id', sids)
        .eq('climbing_type', 'boulder');
      if (aErr) throw new Error(aErr.message);
      const out: ColorCountMap = {};
      for (const r of (aRows ?? []) as Array<{
        result: string;
        problem: { color: string | null } | null;
      }>) {
        if (r.result !== 'send') continue;
        const col = r.problem?.color;
        if (!col) continue;
        out[col] = (out[col] ?? 0) + 1;
      }
      return out;
    },
  });

  const addSend = useMutation({
    mutationFn: async (color: string) => {
      if (!userId || !args.gymId || !args.battleDate || !args.battleId) {
        throw new Error('Not ready');
      }
      // 1) session find-or-create — 같은 (gym, date) 의 세션이 여럿이면 가장 최근 것 사용
      let sid: string;
      {
        const { data: existing, error: fErr } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('gym_id', args.gymId)
          .eq('session_date', args.battleDate)
          .order('created_at', { ascending: false })
          .limit(1);
        if (fErr) throw new Error(fErr.message);
        const found = (existing ?? [])[0] as { id: string } | undefined;
        if (found) {
          sid = found.id;
        } else {
          const { data: created, error: sErr } = await supabase
            .from('sessions')
            .insert({
              user_id: userId,
              gym_id: args.gymId,
              session_date: args.battleDate,
            })
            .select('id')
            .single();
          if (sErr) throw new Error(sErr.message);
          sid = (created as { id: string }).id;
        }
      }
      // 2) problem find-or-create — gym + color (boulder)
      let pid: string;
      {
        const { data: existing, error: fErr } = await supabase
          .from('problems')
          .select('id')
          .eq('gym_id', args.gymId)
          .eq('color', color)
          .is('route_grade', null)
          .order('created_at', { ascending: false })
          .limit(1);
        if (fErr) throw new Error(fErr.message);
        const found = (existing ?? [])[0] as { id: string } | undefined;
        if (found) {
          pid = found.id;
        } else {
          const { data: created, error: pErr } = await supabase
            .from('problems')
            .insert({ gym_id: args.gymId, color, created_by: userId })
            .select('id')
            .single();
          if (pErr) throw new Error(pErr.message);
          pid = (created as { id: string }).id;
        }
      }
      // 3) attempt INSERT — felt_grade 는 안 채움. 점수는 battle.color_grades 의
      // (color → points) 직접 매핑으로 환산되기 때문에 V 변환 불필요.
      const { error: aErr } = await supabase.from('attempts').insert({
        session_id: sid,
        problem_id: pid,
        climbing_type: 'boulder',
        result: 'send',
      });
      if (aErr) throw new Error(aErr.message);
    },
    // optimistic: 로컬 count 즉시 +1
    onMutate: async (color) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<ColorCountMap>(key) ?? {};
      const next = { ...prev, [color]: (prev[color] ?? 0) + 1 };
      queryClient.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['battles', 'ranking', args.battleId] });
    },
  });

  const removeSend = useMutation({
    mutationFn: async (color: string) => {
      if (!userId || !args.gymId || !args.battleDate) throw new Error('Not ready');
      // 1) sessions — 같은 (gym, date) 의 모든 세션 (multiple 허용)
      const { data: sessionRows } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('gym_id', args.gymId)
        .eq('session_date', args.battleDate);
      const sids = ((sessionRows ?? []) as Array<{ id: string }>).map((r) => r.id);
      if (sids.length === 0) return;
      // 2) 해당 색깔 problem 들
      const { data: probs } = await supabase
        .from('problems')
        .select('id')
        .eq('gym_id', args.gymId)
        .eq('color', color);
      const pids = ((probs ?? []) as Array<{ id: string }>).map((p) => p.id);
      if (pids.length === 0) return;
      // 3) attempts: 가장 최근 send 1개 찾아서 DELETE
      const { data: candAttempts } = await supabase
        .from('attempts')
        .select('id, created_at')
        .in('session_id', sids)
        .eq('result', 'send')
        .eq('climbing_type', 'boulder')
        .in('problem_id', pids)
        .order('created_at', { ascending: false })
        .limit(1);
      const targetId = (candAttempts ?? [])[0]?.id;
      if (!targetId) return;
      const { error } = await supabase.from('attempts').delete().eq('id', targetId);
      if (error) throw new Error(error.message);
    },
    onMutate: async (color) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<ColorCountMap>(key) ?? {};
      const cur = prev[color] ?? 0;
      if (cur <= 0) return { prev };
      const next = { ...prev, [color]: cur - 1 };
      queryClient.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['battles', 'ranking', args.battleId] });
    },
  });

  return {
    counts: counts.data ?? {},
    isLoading: counts.isLoading,
    addSend: (color: string) => addSend.mutate(color),
    removeSend: (color: string) => removeSend.mutate(color),
    isPending: addSend.isPending || removeSend.isPending,
  };
}
