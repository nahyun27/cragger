import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type RecentGym = {
  id: string;
  name: string;
  branch: string | null;
};

// 사용자가 최근 운동한 distinct gym 최대 3개. 사후 기록 폼의 암장 칩으로 사용.
// 세션 0개면 빈 배열 반환.
export function useRecentGyms() {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  return useQuery({
    queryKey: ['sessions', userId, 'recent-gyms'] as const,
    enabled: !!userId,
    queryFn: async (): Promise<RecentGym[]> => {
      // 최근 15세션 가져와서 클라이언트에서 distinct gym 추출.
      // (Postgres distinct on은 sb-js로 깔끔히 표현하기 까다로움.
      // 15개는 평균 ≥3개 distinct gym 확보하기 충분한 표본.)
      const { data, error } = await supabase
        .from('sessions')
        .select('gym_id, created_at, gyms:gym_id (id, name, branch)')
        .eq('user_id', userId!)
        .not('gym_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw new Error(error.message);

      const seen = new Set<string>();
      const result: RecentGym[] = [];
      for (const row of (data ?? []) as Array<{
        gym_id: string;
        gyms: { id: string; name: string; branch: string | null } | null;
      }>) {
        if (!row.gyms || seen.has(row.gym_id)) continue;
        seen.add(row.gym_id);
        result.push(row.gyms);
        if (result.length >= 3) break;
      }
      return result;
    },
  });
}
