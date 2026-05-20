import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// 사용자의 attempts에서 색깔별 빈도 집계.
// gymId 주어지면 그 암장의 attempts만, 없으면 전체 (글로벌).
// 빈도 desc로 정렬된 color array 반환. ColorCountsTable이 이 순서대로 row 렌더.
export function useRecentColorActivity(gymId: string | null | undefined) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;

  return useQuery({
    queryKey: ['recent-colors', userId, gymId ?? null] as const,
    enabled: !!userId,
    queryFn: async (): Promise<string[]> => {
      // 사용자의 attempts → problem.color (옵션: problem.gym_id 필터)
      // 최근 N개 한정 — 200건이면 색깔 분포 충분히 안정
      let q = supabase
        .from('attempts')
        .select(
          'created_at, session:sessions!inner(user_id), problem:problems!inner(color, gym_id)',
        )
        .eq('session.user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(200);

      if (gymId) {
        q = q.eq('problem.gym_id', gymId);
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      type Row = { problem: { color: string } | null };
      const counts = new Map<string, number>();
      for (const r of (data ?? []) as unknown as Row[]) {
        const color = r.problem?.color;
        if (!color) continue;
        counts.set(color, (counts.get(color) ?? 0) + 1);
      }
      // count desc 정렬해서 색깔 키만 반환
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);
    },
  });
}
