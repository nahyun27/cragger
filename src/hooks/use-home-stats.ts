import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type HomeStats = {
  weeklySessions: number;
  weeklySends: number;
  maxVGrade: string | null;
};

const SEND_RESULTS = new Set(['send', 'onsight', 'flash']);

// Monday of the current ISO week, as YYYY-MM-DD.
function startOfThisWeekYMD(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offsetToMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Parses 'V0' .. 'V8+', 'V3-' to a sortable number. Returns null for unknown.
function vGradeNum(g: string): number | null {
  const m = g.match(/^V(\d+)([+-]?)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (Number.isNaN(n)) return null;
  if (m[2] === '+') return n + 0.5;
  if (m[2] === '-') return n - 0.5;
  return n;
}

function vGradeFromNum(n: number): string {
  const base = Math.floor(n);
  const frac = n - base;
  if (frac >= 0.5) return `V${base}+`;
  if (frac < 0 || frac > 0) return `V${base}`;
  return `V${base}`;
}

export function useHomeStats() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['home-stats', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<HomeStats> => {
      const weekStart = startOfThisWeekYMD();

      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId!)
        .gte('session_date', weekStart);
      if (sErr) throw new Error(sErr.message);
      const sessionRows = (sessions ?? []) as Array<{ id: string }>;
      if (sessionRows.length === 0) {
        return { weeklySessions: 0, weeklySends: 0, maxVGrade: null };
      }

      const sessionIds = sessionRows.map((s) => s.id);
      const { data: attempts, error: aErr } = await supabase
        .from('attempts')
        .select('result, felt_grade')
        .in('session_id', sessionIds);
      if (aErr) throw new Error(aErr.message);
      const list = (attempts ?? []) as Array<{
        result: string;
        felt_grade: string | null;
      }>;

      let sends = 0;
      let maxNum: number | null = null;
      for (const a of list) {
        if (!SEND_RESULTS.has(a.result)) continue;
        sends += 1;
        if (!a.felt_grade) continue;
        const n = vGradeNum(a.felt_grade);
        if (n === null) continue;
        if (maxNum === null || n > maxNum) maxNum = n;
      }

      return {
        weeklySessions: sessionRows.length,
        weeklySends: sends,
        maxVGrade: maxNum === null ? null : vGradeFromNum(maxNum),
      };
    },
  });
}
