import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

// 이 암장에 grade_votes 가 한 표라도 들어간 색깔 set.
// "이 암장에 존재한다고 알려진 색깔"의 근사치 — gym_color_schemes를 따로 채우지
// 않은 현 단계에선 grade_votes가 가장 가까운 신호.
// 0개면 빈 배열 반환 → 호출 측에서 GRID_COLORS fallback.
export function useGymRegisteredColors(gymId: string | undefined | null) {
  return useQuery({
    queryKey: ['gyms', gymId, 'registered-colors'] as const,
    enabled: !!gymId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('grade_votes')
        .select('color')
        .eq('gym_id', gymId!);
      if (error) throw new Error(error.message);
      const set = new Set<string>();
      for (const r of (data ?? []) as Array<{ color: string }>) set.add(r.color);
      return Array.from(set);
    },
  });
}
