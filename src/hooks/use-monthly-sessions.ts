import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type MonthlySession = {
  id: string;
  session_date: string;
  duration_min: number | null;
  gym: { id: string; name: string; branch: string | null } | null;
  send_count: number;
};

export type MonthlySessionsResult = {
  sessions: MonthlySession[];
  byDate: Record<string, MonthlySession[]>;
  sendCountsByDate: Record<string, number>;
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
        .select('id, session_date, duration_min, gym:gyms(id, name, branch)')
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
        gym: { id: string; name: string; branch: string | null } | null;
      }>;

      if (rows.length === 0) {
        return { sessions: [], byDate: {}, sendCountsByDate: {} };
      }

      const sessionIds = rows.map((r) => r.id);
      const { data: sendRows, error: aErr } = await supabase
        .from('attempts')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('result', 'send');
      if (aErr) throw new Error(aErr.message);

      const sendCountBySession = new Map<string, number>();
      for (const r of (sendRows ?? []) as Array<{ session_id: string }>) {
        sendCountBySession.set(r.session_id, (sendCountBySession.get(r.session_id) ?? 0) + 1);
      }

      const merged: MonthlySession[] = rows.map((r) => ({
        ...r,
        send_count: sendCountBySession.get(r.id) ?? 0,
      }));

      const byDate: Record<string, MonthlySession[]> = {};
      const sendCountsByDate: Record<string, number> = {};
      for (const s of merged) {
        if (!byDate[s.session_date]) byDate[s.session_date] = [];
        byDate[s.session_date].push(s);
        sendCountsByDate[s.session_date] = (sendCountsByDate[s.session_date] ?? 0) + s.send_count;
      }

      return { sessions: merged, byDate, sendCountsByDate };
    },
  });
}
