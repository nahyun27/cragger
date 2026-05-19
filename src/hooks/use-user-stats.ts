import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type ColorStat = {
  color: string;
  sendCount: number;
};

export type GymStats = {
  gymId: string;
  name: string;
  branch: string | null;
  visitCount: number;
  lastVisitDate: string;
  colors: ColorStat[];
};

export type UserStats = {
  totalSessions: number;
  totalSends: number;
  activityDays: number;
  gyms: GymStats[];
};

const SEND_RESULTS = new Set(['send', 'onsight', 'flash']);

// Client-side 집계. 마이그레이션 회피.
// 2 쿼리: sessions (+ joined gym) → attempts (+ problem.color).
// attempts → problems → gyms 깊이 traversal 안 함 — session.gym_id가 이미
// 모든 attempt의 gym 정보를 결정.
export function useUserStats() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['user-stats', userId] as const,
    enabled: !!userId,
    queryFn: async (): Promise<UserStats> => {
      // 1) Sessions
      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('id, session_date, gym_id, gym:gyms(id, name, branch)')
        .eq('user_id', userId!);
      if (sErr) throw new Error(sErr.message);
      const sessionsList = (sessions ?? []) as Array<{
        id: string;
        session_date: string;
        gym_id: string | null;
        gym: { id: string; name: string; branch: string | null } | null;
      }>;

      if (sessionsList.length === 0) {
        return { totalSessions: 0, totalSends: 0, activityDays: 0, gyms: [] };
      }

      // session_id → gym lookup
      const sessionToGym = new Map<
        string,
        { id: string; name: string; branch: string | null }
      >();
      for (const s of sessionsList) {
        if (s.gym) sessionToGym.set(s.id, s.gym);
      }

      // 2) Attempts (with problem.color only)
      const sessionIds = sessionsList.map((s) => s.id);
      const { data: attempts, error: aErr } = await supabase
        .from('attempts')
        .select('session_id, result, problem:problems(color)')
        .in('session_id', sessionIds);
      if (aErr) throw new Error(aErr.message);
      const attemptsList = (attempts ?? []) as Array<{
        session_id: string;
        result: string;
        problem: { color: string } | null;
      }>;

      // Per-gym aggregator
      type Bucket = {
        gymId: string;
        name: string;
        branch: string | null;
        sessionIds: Set<string>;
        latestDate: string;
        colorSends: Map<string, number>;
      };
      const gymMap = new Map<string, Bucket>();
      for (const s of sessionsList) {
        if (!s.gym) continue;
        const existing = gymMap.get(s.gym.id);
        if (existing) {
          existing.sessionIds.add(s.id);
          if (s.session_date > existing.latestDate) existing.latestDate = s.session_date;
        } else {
          gymMap.set(s.gym.id, {
            gymId: s.gym.id,
            name: s.gym.name,
            branch: s.gym.branch,
            sessionIds: new Set([s.id]),
            latestDate: s.session_date,
            colorSends: new Map(),
          });
        }
      }

      let totalSends = 0;
      for (const a of attemptsList) {
        if (!SEND_RESULTS.has(a.result)) continue;
        totalSends += 1;
        if (!a.problem) continue;
        const sessionGym = sessionToGym.get(a.session_id);
        if (!sessionGym) continue;
        const bucket = gymMap.get(sessionGym.id);
        if (!bucket) continue;
        const prev = bucket.colorSends.get(a.problem.color) ?? 0;
        bucket.colorSends.set(a.problem.color, prev + 1);
      }

      const uniqueDates = new Set(sessionsList.map((s) => s.session_date));

      const gyms: GymStats[] = Array.from(gymMap.values())
        .map((b) => ({
          gymId: b.gymId,
          name: b.name,
          branch: b.branch,
          visitCount: b.sessionIds.size,
          lastVisitDate: b.latestDate,
          colors: Array.from(b.colorSends.entries())
            .map(([color, sendCount]) => ({ color, sendCount }))
            .sort((a, b) => b.sendCount - a.sendCount),
        }))
        .sort((a, b) => {
          // 1차: 방문 횟수 desc, 2차: 최근 방문 desc
          if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
          return b.lastVisitDate.localeCompare(a.lastVisitDate);
        });

      return {
        totalSessions: sessionsList.length,
        totalSends,
        activityDays: uniqueDates.size,
        gyms,
      };
    },
  });
}
