import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type DailyActivity = {
  // 일별 세션 수 — heatmap 강도용
  byDate: Map<string, number>; // 'YYYY-MM-DD' → count
  // 출력 편의: 가장 오래된 → 최신
  start: Date;
  end: Date;
};

// 지난 daysBack 일 (오늘 포함) 의 일별 세션 카운트.
// 12개월 ≈ 365일 정도가 적당.
export function useDailyActivity(daysBack: number = 365) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['daily-activity', userId, daysBack] as const,
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DailyActivity> => {
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      const start = new Date(end);
      start.setDate(start.getDate() - daysBack + 1);
      const startStr = isoDate(start);
      const { data, error } = await supabase
        .from('sessions')
        .select('session_date')
        .eq('user_id', userId!)
        .gte('session_date', startStr);
      if (error) throw new Error(error.message);
      const map = new Map<string, number>();
      for (const r of (data ?? []) as Array<{ session_date: string }>) {
        map.set(r.session_date, (map.get(r.session_date) ?? 0) + 1);
      }
      return { byDate: map, start, end };
    },
  });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
