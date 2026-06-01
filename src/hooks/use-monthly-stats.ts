import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type MonthlyBucket = {
  yearMonth: string;  // 'YYYY-MM'
  monthLabel: string; // 'M월'
  sessionCount: number;
  sendCount: number;
  maxVNum: number | null;  // 해당 월 최고 V (felt_grade ∨ crowd 평균)
};

export type GradeBucket = {
  vGrade: string;  // 'V0' ~ 'V8+'
  sendCount: number;
  vNum: number;    // 정렬용 — V0=0, V0+=0.5, V1=1, ...
};

export type DeepStats = {
  monthly: MonthlyBucket[];     // 최근 N개월 (오래된 → 최근 순)
  gradeDistribution: GradeBucket[];  // V0 → V8+ 순 (felt_grade 있는 attempts 만)
  maxVGrade: string | null;     // 최고 등록 V그레이드 (lifetime)
};

const SEND_RESULTS = new Set(['send', 'onsight', 'flash']);

// 'V3' → 3, 'V3+' → 3.5, 'V0' → 0. 형식 안 맞으면 null.
function vGradeToNum(g: string): number | null {
  const m = /^V(\d+)([+-])?$/.exec(g.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const suffix = m[2];
  if (suffix === '+') return n + 0.5;
  if (suffix === '-') return n - 0.5;
  return n;
}

// YYYY-MM 추출
function ymOf(iso: string): string {
  return iso.slice(0, 7);
}

// 'YYYY-MM' → 'M월'
function monthLabelOf(ym: string): string {
  const m = parseInt(ym.slice(5, 7), 10);
  return `${m}월`;
}

// 지정 endYM(포함) 까지 거슬러 N개월. endYM 없으면 현재 달.
function monthSequence(n: number, endYM?: string): string[] {
  const out: string[] = [];
  let endY: number, endM: number;
  if (endYM) {
    endY = parseInt(endYM.slice(0, 4), 10);
    endM = parseInt(endYM.slice(5, 7), 10) - 1;  // 0-indexed
  } else {
    const d = new Date();
    endY = d.getFullYear();
    endM = d.getMonth();
  }
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(endY, endM - i, 1);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    out.push(`${y}-${m}`);
  }
  return out;
}

export type MonthlyStatsOpts = {
  months?: number;
  endYearMonth?: string;  // 'YYYY-MM' — 이 달 (포함) 까지 N개월
};

export function useMonthlyStats(opts: MonthlyStatsOpts = {}) {
  const months = opts.months ?? 6;
  const endYM = opts.endYearMonth;
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;

  return useQuery({
    queryKey: ['monthly-stats', userId, months, endYM ?? null] as const,
    enabled: !!userId,
    queryFn: async (): Promise<DeepStats> => {
      // 1) 최근 N개월 + lifetime grade 분포에 쓰기 위해 lifetime sessions 가져옴.
      //    sessions 자체는 가벼우니 OK. 그래도 sessionsId 만 받으면 됨.
      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('id, session_date')
        .eq('user_id', userId!);
      if (sErr) throw new Error(sErr.message);
      const sessionsList = (sessions ?? []) as Array<{
        id: string;
        session_date: string;
      }>;

      // 2) attempts (felt_grade + problem.color/gym_id 포함). lifetime — 분포에 필요.
      const sessionIds = sessionsList.map((s) => s.id);
      type AttemptRow = {
        session_id: string;
        result: string;
        felt_grade: string | null;
        problem: { color: string | null; gym_id: string | null } | null;
      };
      const attemptsList: AttemptRow[] = [];
      if (sessionIds.length > 0) {
        const { data: attempts, error: aErr } = await supabase
          .from('attempts')
          .select('session_id, result, felt_grade, problem:problems(color, gym_id)')
          .in('session_id', sessionIds);
        if (aErr) throw new Error(aErr.message);
        attemptsList.push(...((attempts ?? []) as AttemptRow[]));
      }

      // crowd V그레이드 lookup — felt_grade 없는 attempt 보강 (gym_color_grade_stats)
      const gymColorPairs = new Set<string>();
      for (const a of attemptsList) {
        if (a.problem?.gym_id && a.problem.color) {
          gymColorPairs.add(`${a.problem.gym_id}:${a.problem.color}`);
        }
      }
      const crowdVMap = new Map<string, number>();
      if (gymColorPairs.size > 0) {
        const gymIds = Array.from(new Set(Array.from(gymColorPairs).map((p) => p.split(':')[0])));
        const { data: statsRows } = await supabase
          .from('gym_color_grade_stats')
          .select('gym_id, color, avg_v_grade')
          .in('gym_id', gymIds);
        for (const r of (statsRows ?? []) as Array<{
          gym_id: string; color: string; avg_v_grade: number | null;
        }>) {
          if (r.avg_v_grade != null) crowdVMap.set(`${r.gym_id}:${r.color}`, r.avg_v_grade);
        }
      }

      // session_id → session_date
      const sidToDate = new Map<string, string>();
      for (const s of sessionsList) sidToDate.set(s.id, s.session_date);

      // 월별 버킷 초기화 (지난 N개월)
      const buckets = new Map<string, {
        sessions: Set<string>; sends: number; maxV: number | null;
      }>();
      for (const ym of monthSequence(months, endYM)) {
        buckets.set(ym, { sessions: new Set(), sends: 0, maxV: null });
      }

      // 월별 sessionCount
      for (const s of sessionsList) {
        const ym = ymOf(s.session_date);
        const b = buckets.get(ym);
        if (b) b.sessions.add(s.id);
      }

      // 월별 sendCount + maxV + lifetime V 분포
      const gradeCounts = new Map<string, number>();
      let maxV: { grade: string; n: number } | null = null;
      for (const a of attemptsList) {
        if (!SEND_RESULTS.has(a.result)) continue;
        const date = sidToDate.get(a.session_id);
        const ym = date ? ymOf(date) : null;
        const b = ym ? buckets.get(ym) : null;
        if (b) b.sends += 1;

        // V 그레이드: felt_grade > crowd 평균
        let n: number | null = a.felt_grade ? vGradeToNum(a.felt_grade.trim()) : null;
        if (n == null && a.problem?.gym_id && a.problem.color) {
          n = crowdVMap.get(`${a.problem.gym_id}:${a.problem.color}`) ?? null;
        }
        if (n != null) {
          if (b && (b.maxV == null || n > b.maxV)) b.maxV = n;
          if (a.felt_grade) {
            const g = a.felt_grade.trim();
            gradeCounts.set(g, (gradeCounts.get(g) ?? 0) + 1);
            if (maxV == null || n > maxV.n) maxV = { grade: g, n };
          } else if (maxV == null || n > maxV.n) {
            // crowd-derived: 정수로 라벨링 (V3 같은 형태)
            maxV = { grade: `V${Math.round(n)}`, n };
          }
        }
      }

      const monthly: MonthlyBucket[] = monthSequence(months, endYM).map((ym) => ({
        yearMonth: ym,
        monthLabel: monthLabelOf(ym),
        sessionCount: buckets.get(ym)?.sessions.size ?? 0,
        sendCount: buckets.get(ym)?.sends ?? 0,
        maxVNum: buckets.get(ym)?.maxV ?? null,
      }));

      const gradeDistribution: GradeBucket[] = Array.from(gradeCounts.entries())
        .map(([grade, count]) => {
          const n = vGradeToNum(grade);
          return n != null ? { vGrade: grade, sendCount: count, vNum: n } : null;
        })
        .filter((x): x is GradeBucket => x !== null)
        .sort((a, b) => a.vNum - b.vNum);

      return {
        monthly,
        gradeDistribution,
        maxVGrade: maxV?.grade ?? null,
      };
    },
  });
}
