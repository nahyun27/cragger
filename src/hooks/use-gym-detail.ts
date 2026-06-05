import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type GymRow = {
  id: string;
  name: string;
  branch: string | null;
  city: string;
  district: string | null;
  address: string | null;
  size_pyeong: number | null;
  floors_count: number | null;
  opened_at: string | null;
  description: string | null;
  parking_info: string | null;
  phone: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  has_boulder: boolean;
  has_lead: boolean;
  has_top_rope: boolean;
  has_speed: boolean;
  has_auto_belay: boolean;
  has_moonboard: boolean;
  has_kilter: boolean;
  has_tension: boolean;
  has_shower: boolean;
  has_locker: boolean;
  has_parking: boolean;
  logo_url: string | null;
  logo_bg_hex: string | null;
  facilities: string[];
};

export type ColorScheme = {
  id: string;
  color: string;
  color_hex: string | null;
  order_index: number;
  official_label: string | null;
};

export type ColorStat = {
  color: string;
  vote_count: number;
  avg_v_grade: number | null;
  avg_v_grade_label: string | null;
};

export type GymDetail = GymRow & {
  color_schemes: ColorScheme[];
  color_stats: ColorStat[];
};

export function useGymDetail(gymId: string | undefined) {
  return useQuery({
    queryKey: ['gyms', gymId, 'detail'] as const,
    enabled: !!gymId,
    queryFn: async (): Promise<GymDetail> => {
      const [gymRes, schemesRes, statsRes] = await Promise.all([
        supabase.from('gyms').select('*').eq('id', gymId!).single(),
        supabase
          .from('gym_color_schemes')
          .select('id, color, color_hex, order_index, official_label')
          .eq('gym_id', gymId!)
          .order('order_index', { ascending: true }),
        supabase
          .from('gym_color_grade_stats')
          .select('color, vote_count, avg_v_grade, avg_v_grade_label')
          .eq('gym_id', gymId!),
      ]);

      if (gymRes.error) throw new Error(gymRes.error.message);
      if (schemesRes.error) throw new Error(schemesRes.error.message);
      if (statsRes.error) throw new Error(statsRes.error.message);

      // 색깔 통계는 어려운 순(평균 V그레이드 desc). null은 맨 뒤.
      const colorStats = ((statsRes.data ?? []) as ColorStat[])
        .slice()
        .sort((a, b) => {
          const av = a.avg_v_grade ?? -Infinity;
          const bv = b.avg_v_grade ?? -Infinity;
          return bv - av;
        });

      return {
        ...(gymRes.data as GymRow),
        color_schemes: (schemesRes.data ?? []) as ColorScheme[],
        color_stats: colorStats,
      };
    },
  });
}
