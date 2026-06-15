import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { checkBadgesAndNotify } from '@/lib/check-badges-and-notify';
import { cancelWorkoutReminderForPlan } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

import type { BoardProblemEntry, BoardType } from '@/components/climb/board-entry';
import type { GridColor } from '@/components/climb/color-grid';
import type { EnduranceStyle } from '@/components/climb/endurance-entry';
import type { LeadResult, LeadRoute } from '@/components/climb/lead-entry';

// 색깔별 카운트. 적어도 하나의 색깔이 tries > 0 이어야 의미 있음.
// sends <= tries는 호출 측에서 보장.
export type ColorCount = {
  color: GridColor;
  tries: number;
  sends: number;
};

export type ClimbingDiscipline = 'boulder' | 'lead' | 'board' | 'endurance' | 'strength';

export type SprayWallAttemptEntry = {
  problemId: string;
  result: 'send' | 'fall';
  tries: number;
};

export type RecordSessionArgs = {
  gymId: string | null;
  sessionDate: string; // 'YYYY-MM-DD'
  durationMin: number | null;
  condition: number | null; // 1..5 or null
  notes: string | null;
  membershipId?: string | null;
  discipline: ClimbingDiscipline;
  colors?: ColorCount[];                         // boulder
  sprayWallAttempts?: SprayWallAttemptEntry[];   // boulder + 스프레이월 선택
  leadRoutes?: LeadRoute[];                      // lead
  boardType?: BoardType | null;                  // board
  boardProblems?: BoardProblemEntry[];           // board
  enduranceStyle?: EnduranceStyle | null;        // endurance
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

      // 종목별 유효성
      if (args.discipline === 'boulder') {
        const usedColors = (args.colors ?? []).filter((c) => c.tries > 0);
        const hasSprayWall = (args.sprayWallAttempts ?? []).length > 0;
        if (usedColors.length === 0 && !hasSprayWall) {
          throw new Error('색깔별 기록 또는 스프레이월 문제를 1개 이상 추가해주세요');
        }
      } else if (args.discipline === 'lead') {
        if (!args.leadRoutes || args.leadRoutes.length === 0) {
          throw new Error('최소 한 루트를 추가하세요');
        }
      } else if (args.discipline === 'board') {
        if (!args.boardType) throw new Error('보드 종류를 선택해주세요');
        const filled = (args.boardProblems ?? []).filter((p) => p.name.trim().length > 0);
        if (filled.length === 0) throw new Error('문제를 1개 이상 추가해주세요');
      } else if (args.discipline === 'endurance') {
        const hasStyle = !!args.enduranceStyle;
        const hasSpray = (args.sprayWallAttempts ?? []).length > 0;
        if (!hasStyle && !hasSpray) throw new Error('스타일을 선택하거나 스프레이월 문제를 추가해주세요');
      }

      // 1) sessions — discipline 을 category 로도 저장 (필터/통계용)
      const { data: sessionRow, error: sessionErr } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          gym_id: args.gymId ?? null,
          session_date: args.sessionDate,
          duration_min: args.durationMin,
          notes: args.notes,
          condition: args.condition,
          membership_id: args.membershipId ?? null,
          completed_at: new Date().toISOString(),
          category: args.discipline,                              // 종목 = 카테고리
          board_type: args.discipline === 'board' ? args.boardType ?? null : null,
          endurance_style:
            args.discipline === 'endurance' ? args.enduranceStyle ?? null : null,
        })
        .select('id')
        .single();
      if (sessionErr) throw new Error(sessionErr.message);
      const sessionId = (sessionRow as { id: string }).id;

      // 종목별 problems/attempts 입력
      if (args.discipline === 'boulder' && args.gymId) {
        const usedColors = (args.colors ?? []).filter((c) => c.tries > 0);
        if (usedColors.length > 0) {
          await insertBoulder(sessionId, args.gymId, userId, usedColors);
        }
        if ((args.sprayWallAttempts ?? []).length > 0) {
          await insertSprayWallAttempts(sessionId, args.gymId, userId, args.sprayWallAttempts ?? []);
        }
      } else if (args.discipline === 'lead' && args.gymId) {
        await insertLead(sessionId, args.gymId, userId, args.leadRoutes ?? []);
      } else if (args.discipline === 'board' && args.boardType) {
        await insertBoard(
          sessionId,
          userId,
          args.boardType,
          (args.boardProblems ?? []).filter((p) => p.name.trim().length > 0),
        );
      }
      // endurance: spray wall attempts 가 있으면 저장
      if (args.discipline === 'endurance' && (args.sprayWallAttempts ?? []).length > 0 && args.gymId) {
        await insertSprayWallAttempts(sessionId, args.gymId, userId, args.sprayWallAttempts ?? []);
      }
      // strength 는 attempts 입력 없음 (스타일/카테고리만 session 에 저장)

      // 같은 날 + 같은 암장 + 아직 매칭 안 된 계획 1개에 연결 (있다면).
      // 암장이 없는 세션은 plan 자동 매칭 skip (gym_id로 매칭하기 때문).
      if (args.gymId) {
        const { data: matchedPlan } = await supabase
          .from('session_plans')
          .select('id')
          .eq('user_id', userId)
          .eq('gym_id', args.gymId)
          .eq('planned_date', args.sessionDate)
          .is('completed_session_id', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (matchedPlan?.id) {
          await supabase
            .from('session_plans')
            .update({ completed_session_id: sessionId })
            .eq('id', matchedPlan.id);
          // 매칭됐으면 예약된 D-day 알림도 취소.
          void cancelWorkoutReminderForPlan(matchedPlan.id);
        }
      }

      return { sessionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session_plans'] });
      checkBadgesAndNotify();
    },
  });
}

async function insertBoulder(
  sessionId: string,
  gymId: string,
  userId: string,
  colors: ColorCount[],
) {
  const used = colors.filter((c) => c.tries > 0);
  if (used.length === 0) return;

  const { data: problemRows, error: problemErr } = await supabase
    .from('problems')
    .insert(
      used.map((c) => ({
        gym_id: gymId,
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

  const attemptRows: Array<{
    session_id: string;
    problem_id: string;
    climbing_type: 'boulder';
    result: 'send' | 'project';
  }> = [];
  for (const c of used) {
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
}

async function insertLead(
  sessionId: string,
  gymId: string,
  userId: string,
  routes: LeadRoute[],
) {
  if (routes.length === 0) return;

  // 같은 grade 면 한 problem 으로 묶기 (dedupe). 같은 등급 여러 시도 = 한 problem 의 여러 attempt.
  const uniqueGrades = Array.from(new Set(routes.map((r) => r.grade)));

  const { data: problemRows, error: problemErr } = await supabase
    .from('problems')
    .insert(
      uniqueGrades.map((g) => ({
        gym_id: gymId,
        route_grade: g,
        color: null,
        created_by: userId,
      })),
    )
    .select('id, route_grade');
  if (problemErr) throw new Error(problemErr.message);

  const gradeToProblemId = new Map<string, string>();
  for (const p of (problemRows ?? []) as Array<{ id: string; route_grade: string }>) {
    gradeToProblemId.set(p.route_grade, p.id);
  }

  const attemptRows = routes
    .map((r) => {
      const problemId = gradeToProblemId.get(r.grade);
      if (!problemId) return null;
      return {
        session_id: sessionId,
        problem_id: problemId,
        climbing_type: 'lead' as const,
        result: r.result,
        lead_style: 'lead' as const,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (attemptRows.length > 0) {
    const { error: attemptErr } = await supabase.from('attempts').insert(attemptRows);
    if (attemptErr) throw new Error(attemptErr.message);
  }
}

// 스프레이월 — spray_wall_problem_id 로 attempts 직접 INSERT
async function insertSprayWallAttempts(
  sessionId: string,
  _gymId: string,
  _userId: string,
  entries: SprayWallAttemptEntry[],
) {
  if (entries.length === 0) return;
  const rows = entries.map((e) => ({
    session_id: sessionId,
    climbing_type: 'boulder' as const,
    spray_wall_problem_id: e.problemId,
    result: e.result,
    tries: e.tries,
  }));
  const { error } = await supabase.from('attempts').insert(rows);
  if (error) throw new Error(error.message);
}

// 보드 — board_problems 에 사용자 임의 문제 row 추가 후 attempts 연결
async function insertBoard(
  sessionId: string,
  userId: string,
  boardType: BoardType,
  problems: BoardProblemEntry[],
) {
  if (problems.length === 0) return;

  const { data: problemRows, error: problemErr } = await supabase
    .from('board_problems')
    .insert(
      problems.map((p) => ({
        board_type: boardType,
        name: p.name.trim(),
        official_grade: p.vGrade,
      })),
    )
    .select('id');
  if (problemErr) throw new Error(problemErr.message);

  const rows = (problemRows ?? []) as Array<{ id: string }>;
  if (rows.length !== problems.length) {
    throw new Error('보드 문제 저장 실패');
  }

  const attemptRows = problems.map((p, i) => ({
    session_id: sessionId,
    board_problem_id: rows[i].id,
    climbing_type: 'board' as const,
    result: (p.flash ? 'flash' : 'send') as 'flash' | 'send',
    felt_grade: p.vGrade,
    notes: p.name.trim(),
  }));

  const { error: attemptErr } = await supabase.from('attempts').insert(attemptRows);
  if (attemptErr) throw new Error(attemptErr.message);
}
