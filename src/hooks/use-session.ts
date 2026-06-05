import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import type { ColorCount } from '@/hooks/use-record-session';
import type { LeadRoute, LeadResult } from '@/components/climb/lead-entry';

export type SessionRow = {
  id: string;
  user_id: string;
  gym_id: string | null;
  session_date: string;
  duration_min: number | null;
  condition: number | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  membership_id: string | null;
  membership: {
    id: string;
    membership_type: 'monthly' | 'period' | 'passes' | 'single';
    total_passes: number | null;
    used_passes: number;
    start_date: string;
    end_date: string | null;
  } | null;
  gym: { id: string; name: string; branch: string | null; logo_url: string | null } | null;
};

// 특정 암장에서 내가 한 세션 목록 (recent N개).
export function useMySessionsAtGym(gymId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ['sessions', 'at-gym', gymId, limit] as const,
    enabled: !!gymId,
    queryFn: async (): Promise<SessionRow[]> => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, user_id, gym_id, session_date, duration_min, condition, notes, created_at, completed_at, membership_id, membership:memberships(id, membership_type, total_passes, used_passes, start_date, end_date), gym:gyms(id, name, branch, logo_url)',
        )
        .eq('user_id', uid)
        .eq('gym_id', gymId!)
        .order('session_date', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SessionRow[];
    },
  });
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId] as const,
    enabled: !!sessionId,
    queryFn: async (): Promise<SessionRow> => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, user_id, gym_id, session_date, duration_min, condition, notes, created_at, completed_at, membership_id, membership:memberships(id, membership_type, total_passes, used_passes, start_date, end_date), gym:gyms(id, name, branch, logo_url)',
        )
        .eq('id', sessionId!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as SessionRow;
    },
  });
}

// ── Detail (session + 색깔/등급별 집계) ───────────────────────

export type ColorSummary = {
  color: string;
  sends: number;
  tries: number;
};

export type LeadResultBreakdown = {
  onsight: number;
  flash: number;
  redpoint: number;
  fall: number;
};

export type LeadSummary = {
  grade: string;
  sends: number;  // onsight + flash + redpoint
  tries: number;  // sends + fall
  breakdown: LeadResultBreakdown;
};

export type SessionDiscipline = 'boulder' | 'lead' | 'mixed' | 'empty';

export type SessionDetail = SessionRow & {
  discipline: SessionDiscipline;
  color_summary: ColorSummary[];
  lead_summary: LeadSummary[];   // 등급 오름차순
};

export function useSessionDetail(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'detail'] as const,
    enabled: !!sessionId,
    queryFn: async (): Promise<SessionDetail> => {
      const [sessionRes, attemptsRes] = await Promise.all([
        supabase
          .from('sessions')
          .select(
            'id, user_id, gym_id, session_date, duration_min, condition, notes, created_at, completed_at, membership_id, membership:memberships(id, membership_type, total_passes, used_passes, start_date, end_date), gym:gyms(id, name, branch, logo_url)',
          )
          .eq('id', sessionId!)
          .single(),
        supabase
          .from('attempts')
          .select('result, climbing_type, problem:problems(color, route_grade)')
          .eq('session_id', sessionId!),
      ]);
      if (sessionRes.error) throw new Error(sessionRes.error.message);
      if (attemptsRes.error) throw new Error(attemptsRes.error.message);

      const session = sessionRes.data as unknown as SessionRow;
      const attempts = (attemptsRes.data ?? []) as Array<{
        result: 'onsight' | 'flash' | 'send' | 'project' | 'fall' | 'redpoint';
        climbing_type: 'boulder' | 'lead' | 'board';
        problem: { color: string | null; route_grade: string | null } | null;
      }>;

      const colorMap = new Map<string, ColorSummary>();
      const leadMap = new Map<string, LeadSummary>();
      let boulderCount = 0;
      let leadCount = 0;

      for (const a of attempts) {
        const isSend =
          a.result === 'send' || a.result === 'onsight' ||
          a.result === 'flash' || a.result === 'redpoint';

        if (a.climbing_type === 'lead' && a.problem?.route_grade) {
          leadCount += 1;
          const grade = a.problem.route_grade;
          const cur = leadMap.get(grade) ?? {
            grade,
            sends: 0,
            tries: 0,
            breakdown: { onsight: 0, flash: 0, redpoint: 0, fall: 0 },
          };
          cur.tries += 1;
          if (isSend) cur.sends += 1;
          if (a.result === 'onsight') cur.breakdown.onsight += 1;
          else if (a.result === 'flash') cur.breakdown.flash += 1;
          else if (a.result === 'redpoint') cur.breakdown.redpoint += 1;
          else if (a.result === 'fall') cur.breakdown.fall += 1;
          leadMap.set(grade, cur);
        } else if (a.problem?.color) {
          boulderCount += 1;
          const color = a.problem.color;
          const cur = colorMap.get(color) ?? { color, sends: 0, tries: 0 };
          cur.tries += 1;
          if (isSend) cur.sends += 1;
          colorMap.set(color, cur);
        }
      }

      const discipline: SessionDiscipline =
        boulderCount > 0 && leadCount > 0 ? 'mixed' :
        leadCount > 0 ? 'lead' :
        boulderCount > 0 ? 'boulder' : 'empty';

      const lead_summary = Array.from(leadMap.values()).sort((a, b) =>
        compareGrade(a.grade, b.grade),
      );

      return {
        ...session,
        discipline,
        color_summary: Array.from(colorMap.values()),
        lead_summary,
      };
    },
  });
}

// 5.6 < 5.9 < 5.10a < 5.10d < 5.11a 순. main.sub 로 비교.
function compareGrade(a: string, b: string): number {
  const parse = (g: string): [number, number] => {
    const m = /^5\.(\d+)([a-d])?$/.exec(g.trim());
    if (!m) return [0, 0];
    const main = parseInt(m[1], 10);
    const sub = m[2] ? ('abcd'.indexOf(m[2]) + 1) / 5 : 0;
    return [main, sub];
  };
  const [am, as] = parse(a);
  const [bm, bs] = parse(b);
  if (am !== bm) return am - bm;
  return as - bs;
}

// ── Update (delete-and-recreate) ─────────────────────────────

export type UpdateSessionArgs = {
  sessionId: string;
  gymId: string;
  durationMin: number | null;
  condition: number | null;
  notes: string | null;
  membershipId?: string | null;          // 수정 시 undefined 면 그대로 둠
  // boulder 또는 lead — 둘 중 하나
  colors?: ColorCount[];
  leadRoutes?: LeadRoute[];
};

// 수정 흐름:
//   1. 기존 attempts.problem_id 모음
//   2. attempts DELETE (session_id)
//   3. problems DELETE (모음 id들 — 1세션당 1problem 모델이라 안전)
//   4. sessions UPDATE
//   5. 새 problems + attempts INSERT (record와 동일 패턴)
// 트랜잭션 X — 부분 실패 시 orphan/incomplete 가능 (MVP 수용).
export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: UpdateSessionArgs) => {
      const isLead = (args.leadRoutes?.length ?? 0) > 0;
      const used = (args.colors ?? []).filter((c) => c.tries > 0);
      if (!isLead && used.length === 0) {
        throw new Error('최소 한 색깔(또는 리드 루트) 의 시도를 입력하세요');
      }

      // 1. 기존 problem_id 수집 — 이 세션의 attempts에 달린 것만
      const { data: existing, error: e1 } = await supabase
        .from('attempts')
        .select('problem_id')
        .eq('session_id', args.sessionId)
        .not('problem_id', 'is', null);
      if (e1) throw new Error(e1.message);
      const oldProblemIds = Array.from(
        new Set(
          ((existing ?? []) as Array<{ problem_id: string | null }>)
            .map((r) => r.problem_id)
            .filter((v): v is string => !!v),
        ),
      );

      // 2. attempts 삭제
      const { error: e2 } = await supabase
        .from('attempts')
        .delete()
        .eq('session_id', args.sessionId);
      if (e2) throw new Error(e2.message);

      // 3. 옛 problems 삭제
      if (oldProblemIds.length > 0) {
        const { error: e3 } = await supabase
          .from('problems')
          .delete()
          .in('id', oldProblemIds);
        if (e3) throw new Error(e3.message);
      }

      // 4. session UPDATE — created_by 없이 gym_id/조건만 갱신
      const sessionPatch: Record<string, unknown> = {
        gym_id: args.gymId,
        duration_min: args.durationMin,
        condition: args.condition,
        notes: args.notes,
      };
      if (args.membershipId !== undefined) {
        sessionPatch.membership_id = args.membershipId;
      }
      const { error: e4 } = await supabase
        .from('sessions')
        .update(sessionPatch)
        .eq('id', args.sessionId);
      if (e4) throw new Error(e4.message);

      // user_id 가져오기 (problems.created_by용)
      const { data: sessionRow, error: e4b } = await supabase
        .from('sessions')
        .select('user_id')
        .eq('id', args.sessionId)
        .single();
      if (e4b) throw new Error(e4b.message);
      const userId = (sessionRow as { user_id: string }).user_id;

      if (isLead) {
        // 5L. lead — 같은 grade 묶어서 problem 1개씩
        const routes = args.leadRoutes!;
        const uniqueGrades = Array.from(new Set(routes.map((r) => r.grade)));
        const { data: newProblems, error: e5 } = await supabase
          .from('problems')
          .insert(
            uniqueGrades.map((g) => ({
              gym_id: args.gymId,
              route_grade: g,
              created_by: userId,
            })),
          )
          .select('id, route_grade');
        if (e5) throw new Error(e5.message);
        const gradeToProblemId = new Map<string, string>();
        for (const p of (newProblems ?? []) as Array<{ id: string; route_grade: string }>) {
          gradeToProblemId.set(p.route_grade, p.id);
        }
        // 6L. attempts
        const attemptRows: Array<{
          session_id: string;
          problem_id: string;
          climbing_type: 'lead';
          result: LeadResult;
        }> = [];
        for (const r of routes) {
          const pid = gradeToProblemId.get(r.grade);
          if (!pid) continue;
          attemptRows.push({
            session_id: args.sessionId,
            problem_id: pid,
            climbing_type: 'lead',
            result: r.result,
          });
        }
        if (attemptRows.length > 0) {
          const { error: e6 } = await supabase.from('attempts').insert(attemptRows);
          if (e6) throw new Error(e6.message);
        }
      } else {
        // 5B. boulder — 새 problems INSERT
        const { data: newProblems, error: e5 } = await supabase
          .from('problems')
          .insert(
            used.map((c) => ({
              gym_id: args.gymId,
              color: c.color,
              created_by: userId,
            })),
          )
          .select('id, color');
        if (e5) throw new Error(e5.message);

        const colorToProblemId = new Map<string, string>();
        for (const p of (newProblems ?? []) as Array<{ id: string; color: string }>) {
          colorToProblemId.set(p.color, p.id);
        }

        // 6B. 새 attempts INSERT
        const attemptRows: Array<{
          session_id: string;
          problem_id: string;
          climbing_type: 'boulder';
          result: 'send' | 'project';
        }> = [];
        for (const c of used) {
          const pid = colorToProblemId.get(c.color);
          if (!pid) continue;
          for (let i = 0; i < c.sends; i++) {
            attemptRows.push({
              session_id: args.sessionId,
              problem_id: pid,
              climbing_type: 'boulder',
              result: 'send',
            });
          }
          const projects = Math.max(0, c.tries - c.sends);
          for (let i = 0; i < projects; i++) {
            attemptRows.push({
              session_id: args.sessionId,
              problem_id: pid,
              climbing_type: 'boulder',
              result: 'project',
            });
          }
        }

        if (attemptRows.length > 0) {
          const { error: e6 } = await supabase.from('attempts').insert(attemptRows);
          if (e6) throw new Error(e6.message);
        }
      }

      return { sessionId: args.sessionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

// ── Delete ───────────────────────────────────────────────────

// sessions DELETE → attempts는 ON DELETE CASCADE로 자동.
// problems는 session 직접 연결 없어 orphan으로 남음 (MVP 수용, 통계엔 무해).
export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
