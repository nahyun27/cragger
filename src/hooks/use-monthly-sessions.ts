import { useQuery } from '@tanstack/react-query';

import type { SessionCategory } from '@/constants/session-category';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type ColorSendCount = { color: string; count: number };

export type MonthlySession = {
  id: string;
  session_date: string;
  duration_min: number | null;
  condition: number | null;
  gym: { id: string; name: string; branch: string | null } | null;
  send_count: number;
  attempt_count: number;
  color_sends: ColorSendCount[];
  category: SessionCategory | null;
};

export type MonthlySessionsResult = {
  sessions: MonthlySession[];
  byDate: Record<string, MonthlySession[]>;
  sendCountsByDate: Record<string, number>;
  attemptCountsByDate: Record<string, number>;
  durationByDate: Record<string, number>;  // minutes
  conditionByDate: Record<string, number>; // 1~5, 그날 최고치
  gymCountByDate: Record<string, number>;  // 중복 제거된 gym 수
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function startOfMonth(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

function startOfNextMonth(year: number, month: number): string {
  if (month === 12) return `${year + 1}-01-01`;
  return `${year}-${pad2(month + 1)}-01`;
}

// month is 1-indexed (1=Jan, 12=Dec) to match Korean UX expectations.
export function useMonthlySessions(year: number, month: number) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['sessions', userId, 'monthly', year, month] as const,
    enabled: !!userId,
    queryFn: async (): Promise<MonthlySessionsResult> => {
      const from = startOfMonth(year, month);
      const to = startOfNextMonth(year, month);

      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('id, session_date, duration_min, condition, category, gym:gyms(id, name, branch)')
        .eq('user_id', userId!)
        .gte('session_date', from)
        .lt('session_date', to)
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (sErr) throw new Error(sErr.message);

      const rows = (sessions ?? []) as Array<{
        id: string;
        session_date: string;
        duration_min: number | null;
        condition: number | null;
        category: SessionCategory | null;
        gym: { id: string; name: string; branch: string | null } | null;
      }>;

      const empty: MonthlySessionsResult = {
        sessions: [],
        byDate: {},
        sendCountsByDate: {},
        attemptCountsByDate: {},
        durationByDate: {},
        conditionByDate: {},
        gymCountByDate: {},
      };
      if (rows.length === 0) return empty;

      // attempts: send + total count + 색깔별 완등 (problem.color 조인)
      const sessionIds = rows.map((r) => r.id);
      const { data: attempts, error: aErr } = await supabase
        .from('attempts')
        .select('session_id, result, problem:problems(color)')
        .in('session_id', sessionIds);
      if (aErr) throw new Error(aErr.message);

      const sendCountBySession = new Map<string, number>();
      const totalCountBySession = new Map<string, number>();
      const colorSendsBySession = new Map<string, Map<string, number>>();
      for (const r of (attempts ?? []) as Array<{
        session_id: string;
        result: string;
        problem: { color: string } | null;
      }>) {
        totalCountBySession.set(r.session_id, (totalCountBySession.get(r.session_id) ?? 0) + 1);
        const isSend = r.result === 'send' || r.result === 'flash' || r.result === 'onsight';
        if (isSend) {
          sendCountBySession.set(r.session_id, (sendCountBySession.get(r.session_id) ?? 0) + 1);
          const color = r.problem?.color;
          if (color) {
            if (!colorSendsBySession.has(r.session_id)) {
              colorSendsBySession.set(r.session_id, new Map());
            }
            const m = colorSendsBySession.get(r.session_id)!;
            m.set(color, (m.get(color) ?? 0) + 1);
          }
        }
      }

      const merged: MonthlySession[] = rows.map((r) => {
        const colorMap = colorSendsBySession.get(r.id);
        const color_sends: ColorSendCount[] = colorMap
          ? Array.from(colorMap.entries())
              .map(([color, count]) => ({ color, count }))
              .sort((a, b) => b.count - a.count)
          : [];
        return {
          ...r,
          send_count: sendCountBySession.get(r.id) ?? 0,
          attempt_count: totalCountBySession.get(r.id) ?? 0,
          color_sends,
        };
      });

      const byDate: Record<string, MonthlySession[]> = {};
      const sendCountsByDate: Record<string, number> = {};
      const attemptCountsByDate: Record<string, number> = {};
      const durationByDate: Record<string, number> = {};
      const conditionByDate: Record<string, number> = {};
      const gymSetByDate: Record<string, Set<string>> = {};
      for (const s of merged) {
        if (!byDate[s.session_date]) byDate[s.session_date] = [];
        byDate[s.session_date].push(s);
        sendCountsByDate[s.session_date] = (sendCountsByDate[s.session_date] ?? 0) + s.send_count;
        attemptCountsByDate[s.session_date] = (attemptCountsByDate[s.session_date] ?? 0) + s.attempt_count;
        durationByDate[s.session_date] = (durationByDate[s.session_date] ?? 0) + (s.duration_min ?? 0);
        if (s.condition != null) {
          conditionByDate[s.session_date] = Math.max(
            conditionByDate[s.session_date] ?? 0,
            s.condition,
          );
        }
        if (!gymSetByDate[s.session_date]) gymSetByDate[s.session_date] = new Set();
        if (s.gym) gymSetByDate[s.session_date].add(s.gym.id);
      }
      const gymCountByDate: Record<string, number> = {};
      for (const [d, set] of Object.entries(gymSetByDate)) gymCountByDate[d] = set.size;

      return {
        sessions: merged,
        byDate,
        sendCountsByDate,
        attemptCountsByDate,
        durationByDate,
        conditionByDate,
        gymCountByDate,
      };
    },
  });
}
