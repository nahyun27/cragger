import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type RecentSession = {
  id: string;
  session_date: string;
  duration_min: number | null;
  gym: { id: string; name: string; branch: string | null } | null;
  send_count: number;
  discipline: 'boulder' | 'lead' | 'mixed' | 'empty';
  has_spray_wall: boolean;
  max_lead_grade: string | null;
  color_sends: { color: string; count: number }[];
  lead_sends: { grade: string; count: number }[];
};

function compareLeadGrade(a: string, b: string): number {
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

// 기록 탭의 최근 세션 리스트. 사후 기록 한 번에 INSERT 흐름이라
// completed_at 여부는 따지지 않고 그냥 최근 N개 가져옴.
// 각 세션의 'send' 카운트는 attempts에서 따로 집계 (Postgres group by + JS merge).
export function useRecentSessions(limit = 10) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['sessions', userId, 'recent', limit] as const,
    enabled: !!userId,
    queryFn: async (): Promise<RecentSession[]> => {
      const { data: sessions, error: sessionsErr } = await supabase
        .from('sessions')
        .select(
          'id, session_date, duration_min, gym:gyms(id, name, branch)',
        )
        .eq('user_id', userId!)
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (sessionsErr) throw new Error(sessionsErr.message);
      const sessionRows = (sessions ?? []) as Array<{
        id: string;
        session_date: string;
        duration_min: number | null;
        gym: { id: string; name: string; branch: string | null } | null;
      }>;
      if (sessionRows.length === 0) return [];

      const sessionIds = sessionRows.map((s) => s.id);
      const { data: attempts, error: attemptsErr } = await supabase
        .from('attempts')
        .select('session_id, result, climbing_type, spray_wall_problem_id, problem:problems(color, route_grade)')
        .in('session_id', sessionIds);
      if (attemptsErr) throw new Error(attemptsErr.message);

      const sendCounts = new Map<string, number>();
      const boulderCounts = new Map<string, number>();
      const leadCounts = new Map<string, number>();
      const sprayWallCounts = new Map<string, number>();
      const maxLeadGrade = new Map<string, string>();
      const colorSendsBySession = new Map<string, Map<string, number>>();
      const leadSendsBySession = new Map<string, Map<string, number>>();
      const SEND = new Set(['send', 'onsight', 'flash', 'redpoint']);

      for (const r of (attempts ?? []) as Array<{
        session_id: string;
        result: string;
        climbing_type: 'boulder' | 'lead' | 'board';
        spray_wall_problem_id: string | null;
        problem: { color: string | null; route_grade: string | null } | null;
      }>) {
        const isSend = SEND.has(r.result);
        if (isSend) {
          sendCounts.set(r.session_id, (sendCounts.get(r.session_id) ?? 0) + 1);
        }
        if (r.spray_wall_problem_id) {
          sprayWallCounts.set(r.session_id, (sprayWallCounts.get(r.session_id) ?? 0) + 1);
        } else if (r.climbing_type === 'lead') {
          leadCounts.set(r.session_id, (leadCounts.get(r.session_id) ?? 0) + 1);
          const g = r.problem?.route_grade;
          if (g) {
            const cur = maxLeadGrade.get(r.session_id);
            if (!cur || compareLeadGrade(g, cur) > 0) {
              maxLeadGrade.set(r.session_id, g);
            }
            // 그레이드별 완등 집계 (send만)
            if (isSend) {
              if (!leadSendsBySession.has(r.session_id)) {
                leadSendsBySession.set(r.session_id, new Map());
              }
              const m = leadSendsBySession.get(r.session_id)!;
              m.set(g, (m.get(g) ?? 0) + 1);
            }
          }
        } else if (r.climbing_type === 'boulder') {
          boulderCounts.set(r.session_id, (boulderCounts.get(r.session_id) ?? 0) + 1);

          // 색깔별 완등 집계 (boulder + send만)
          if (isSend && r.problem?.color) {
            if (!colorSendsBySession.has(r.session_id)) {
              colorSendsBySession.set(r.session_id, new Map());
            }
            const m = colorSendsBySession.get(r.session_id)!;
            m.set(r.problem.color, (m.get(r.problem.color) ?? 0) + 1);
          }
        }
      }

      return sessionRows.map((s) => {
        const b = boulderCounts.get(s.id) ?? 0;
        const l = leadCounts.get(s.id) ?? 0;
        const discipline: RecentSession['discipline'] =
          b > 0 && l > 0 ? 'mixed' :
          l > 0 ? 'lead' :
          b > 0 ? 'boulder' : 'empty';
        const colorMap = colorSendsBySession.get(s.id);
        const color_sends = colorMap
          ? Array.from(colorMap.entries())
              .map(([color, count]) => ({ color, count }))
              .sort((a, b) => b.count - a.count)
          : [];
        const leadMap = leadSendsBySession.get(s.id);
        const lead_sends = leadMap
          ? Array.from(leadMap.entries())
              .map(([grade, count]) => ({ grade, count }))
              .sort((a, b) => compareLeadGrade(b.grade, a.grade))  // 어려운 그레이드 먼저
          : [];
        return {
          id: s.id,
          session_date: s.session_date,
          duration_min: s.duration_min,
          gym: s.gym,
          send_count: sendCounts.get(s.id) ?? 0,
          discipline,
          has_spray_wall: (sprayWallCounts.get(s.id) ?? 0) > 0,
          max_lead_grade: maxLeadGrade.get(s.id) ?? null,
          color_sends,
          lead_sends,
        };
      });
    },
  });
}
