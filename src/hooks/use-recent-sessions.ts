import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type RecentSession = {
  id: string;
  session_date: string;
  duration_min: number | null;
  gym: { id: string; name: string; branch: string | null } | null;
  send_count: number;
};

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
      const { data: sendRows, error: attemptsErr } = await supabase
        .from('attempts')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('result', 'send');
      if (attemptsErr) throw new Error(attemptsErr.message);

      const sendCounts = new Map<string, number>();
      for (const r of (sendRows ?? []) as Array<{ session_id: string }>) {
        sendCounts.set(r.session_id, (sendCounts.get(r.session_id) ?? 0) + 1);
      }

      return sessionRows.map((s) => ({
        id: s.id,
        session_date: s.session_date,
        duration_min: s.duration_min,
        gym: s.gym,
        send_count: sendCounts.get(s.id) ?? 0,
      }));
    },
  });
}
