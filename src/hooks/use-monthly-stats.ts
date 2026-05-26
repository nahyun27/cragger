import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type MonthlyBucket = {
  yearMonth: string;  // 'YYYY-MM'
  monthLabel: string; // 'M월'
  sessionCount: number;
  sendCount: number;
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

// 지난 N개월의 yearMonth 시퀀스 (오래된 → 최근)
function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    out.push(`${y}-${m}`);
  }
  return out;
}

export function useMonthlyStats(months: number = 6) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;

  return useQuery({
    queryKey: ['monthly-stats', userId, months] as const,
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

      // 2) attempts (felt_grade 포함). lifetime — 분포에 필요.
      const sessionIds = sessionsList.map((s) => s.id);
      const attemptsList: Array<{ session_id: string; result: string; felt_grade: string | null }> =
        [];
      if (sessionIds.length > 0) {
        // sessionIds 너무 많으면 chunk — 일단 단순.
        const { data: attempts, error: aErr } = await supabase
          .from('attempts')
          .select('session_id, result, felt_grade')
          .in('session_id', sessionIds);
        if (aErr) throw new Error(aErr.message);
        attemptsList.push(
          ...((attempts ?? []) as Array<{ session_id: string; result: string; felt_grade: string | null }>),
        );
      }

      // session_id → session_date
      const sidToDate = new Map<string, string>();
      for (const s of sessionsList) sidToDate.set(s.id, s.session_date);

      // 월별 버킷 초기화 (지난 N개월)
      const buckets = new Map<string, { sessions: Set<string>; sends: number }>();
      for (const ym of lastNMonths(months)) {
        buckets.set(ym, { sessions: new Set(), sends: 0 });
      }

      // 월별 sessionCount
      for (const s of sessionsList) {
        const ym = ymOf(s.session_date);
        const b = buckets.get(ym);
        if (b) b.sessions.add(s.id);
      }

      // 월별 sendCount + V 분포 (lifetime)
      const gradeCounts = new Map<string, number>();
      let maxV: { grade: string; n: number } | null = null;
      for (const a of attemptsList) {
        if (!SEND_RESULTS.has(a.result)) continue;
        const date = sidToDate.get(a.session_id);
        if (date) {
          const b = buckets.get(ymOf(date));
          if (b) b.sends += 1;
        }
        if (a.felt_grade) {
          const g = a.felt_grade.trim();
          gradeCounts.set(g, (gradeCounts.get(g) ?? 0) + 1);
          const n = vGradeToNum(g);
          if (n != null && (maxV == null || n > maxV.n)) maxV = { grade: g, n };
        }
      }

      const monthly: MonthlyBucket[] = lastNMonths(months).map((ym) => ({
        yearMonth: ym,
        monthLabel: monthLabelOf(ym),
        sessionCount: buckets.get(ym)?.sessions.size ?? 0,
        sendCount: buckets.get(ym)?.sends ?? 0,
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
